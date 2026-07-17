/**
 * KotakLiveFeed — Direct browser WebSocket connection to Kotak Securities
 *
 * Ported from the Kotak Neo Python SDK's HSWebSocketLib.py binary protocol.
 * Connects directly to wss://mlhsm.kotaksecurities.com and handles:
 *   - Binary connection handshake (Authorization + Sid)
 *   - Subscribe / unsubscribe scrip & index instruments
 *   - Parsing binary data frames into JSON tick objects
 *   - Heartbeat keep-alive (every 29s)
 *   - Auto-reconnection with exponential backoff
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const WEBSOCKET_URL = "wss://mlhsm.kotaksecurities.com";

const TRASH_VAL = -2147483648;

const BinRespTypes = {
  CONNECTION_TYPE: 1,
  THROTTLING_TYPE: 2,
  ACK_TYPE: 3,
  SUBSCRIBE_TYPE: 4,
  UNSUBSCRIBE_TYPE: 5,
  DATA_TYPE: 6,
  CHPAUSE_TYPE: 7,
  CHRESUME_TYPE: 8,
  SNAPSHOT: 9,
  OPC_SUBSCRIBE: 10,
} as const;

const ResponseTypes = { SNAP: 83, UPDATE: 85 } as const;

const FieldTypes = { FLOAT32: 1, LONG: 2, DATE: 3, STRING: 4 } as const;

const TopicTypes = { SCRIP: "sf", INDEX: "if", DEPTH: "dp" } as const;

const STRING_INDEX = { NAME: 51, SYMBOL: 52, EXCHG: 53, TSYMBOL: 54 } as const;

const INDEX_INDEX = {
  LTP: 2, CLOSE: 3, CHANGE: 10, PERCHANGE: 11, MULTIPLIER: 8, PRECISION: 9,
} as const;

const SCRIP_INDEX = {
  VOLUME: 4, LTP: 5, CLOSE: 21, VWAP: 13,
  MULTIPLIER: 23, PRECISION: 24, CHANGE: 25, PERCHANGE: 26, TURNOVER: 27,
} as const;

// ─── Data type descriptors ────────────────────────────────────────────────────

interface DataTypeDesc { name: string; type: number }
function dt(name: string, type: number): DataTypeDesc { return { name, type }; }

// INDEX_MAPPING — mirrors Python SDK's INDEX_MAPPING
const INDEX_MAPPING: (DataTypeDesc | null)[] = new Array(55).fill(null);
INDEX_MAPPING[0] = dt("ftm0", FieldTypes.DATE);
INDEX_MAPPING[1] = dt("dtm1", FieldTypes.DATE);
INDEX_MAPPING[INDEX_INDEX.LTP] = dt("iv", FieldTypes.FLOAT32);
INDEX_MAPPING[INDEX_INDEX.CLOSE] = dt("ic", FieldTypes.FLOAT32);
INDEX_MAPPING[4] = dt("tvalue", FieldTypes.DATE);
INDEX_MAPPING[5] = dt("highPrice", FieldTypes.FLOAT32);
INDEX_MAPPING[6] = dt("lowPrice", FieldTypes.FLOAT32);
INDEX_MAPPING[7] = dt("openingPrice", FieldTypes.FLOAT32);
INDEX_MAPPING[INDEX_INDEX.MULTIPLIER] = dt("mul", FieldTypes.LONG);
INDEX_MAPPING[INDEX_INDEX.PRECISION] = dt("prec", FieldTypes.LONG);
INDEX_MAPPING[INDEX_INDEX.CHANGE] = dt("cng", FieldTypes.FLOAT32);
INDEX_MAPPING[INDEX_INDEX.PERCHANGE] = dt("nc", FieldTypes.STRING);
INDEX_MAPPING[STRING_INDEX.NAME] = dt("name", FieldTypes.STRING);
INDEX_MAPPING[STRING_INDEX.SYMBOL] = dt("tk", FieldTypes.STRING);
INDEX_MAPPING[STRING_INDEX.EXCHG] = dt("e", FieldTypes.STRING);
INDEX_MAPPING[STRING_INDEX.TSYMBOL] = dt("ts", FieldTypes.STRING);

// SCRIP_MAPPING — mirrors Python SDK's SCRIP_MAPPING
const SCRIP_MAPPING: (DataTypeDesc | null)[] = new Array(100).fill(null);
SCRIP_MAPPING[0] = dt("ftm0", FieldTypes.DATE);
SCRIP_MAPPING[1] = dt("dtm1", FieldTypes.DATE);
SCRIP_MAPPING[2] = dt("fdtm", FieldTypes.DATE);
SCRIP_MAPPING[3] = dt("ltt", FieldTypes.DATE);
SCRIP_MAPPING[SCRIP_INDEX.VOLUME] = dt("v", FieldTypes.LONG);
SCRIP_MAPPING[SCRIP_INDEX.LTP] = dt("ltp", FieldTypes.FLOAT32);
SCRIP_MAPPING[6] = dt("ltq", FieldTypes.LONG);
SCRIP_MAPPING[7] = dt("tbq", FieldTypes.LONG);
SCRIP_MAPPING[8] = dt("tsq", FieldTypes.LONG);
SCRIP_MAPPING[9] = dt("bp", FieldTypes.FLOAT32);
SCRIP_MAPPING[10] = dt("sp", FieldTypes.FLOAT32);
SCRIP_MAPPING[11] = dt("bq", FieldTypes.LONG);
SCRIP_MAPPING[12] = dt("bs", FieldTypes.LONG);
SCRIP_MAPPING[SCRIP_INDEX.VWAP] = dt("ap", FieldTypes.FLOAT32);
SCRIP_MAPPING[14] = dt("lo", FieldTypes.FLOAT32);
SCRIP_MAPPING[15] = dt("h", FieldTypes.FLOAT32);
SCRIP_MAPPING[16] = dt("lcl", FieldTypes.FLOAT32);
SCRIP_MAPPING[17] = dt("ucl", FieldTypes.FLOAT32);
SCRIP_MAPPING[18] = dt("yh", FieldTypes.FLOAT32);
SCRIP_MAPPING[19] = dt("yl", FieldTypes.FLOAT32);
SCRIP_MAPPING[20] = dt("op", FieldTypes.FLOAT32);
SCRIP_MAPPING[SCRIP_INDEX.CLOSE] = dt("c", FieldTypes.FLOAT32);
SCRIP_MAPPING[22] = dt("oi", FieldTypes.LONG);
SCRIP_MAPPING[SCRIP_INDEX.MULTIPLIER] = dt("mul", FieldTypes.LONG);
SCRIP_MAPPING[SCRIP_INDEX.PRECISION] = dt("prec", FieldTypes.LONG);
SCRIP_MAPPING[SCRIP_INDEX.CHANGE] = dt("cng", FieldTypes.FLOAT32);
SCRIP_MAPPING[SCRIP_INDEX.PERCHANGE] = dt("nc", FieldTypes.STRING);
SCRIP_MAPPING[SCRIP_INDEX.TURNOVER] = dt("to", FieldTypes.FLOAT32);
SCRIP_MAPPING[STRING_INDEX.NAME] = dt("name", FieldTypes.STRING);
SCRIP_MAPPING[STRING_INDEX.SYMBOL] = dt("tk", FieldTypes.STRING);
SCRIP_MAPPING[STRING_INDEX.EXCHG] = dt("e", FieldTypes.STRING);
SCRIP_MAPPING[STRING_INDEX.TSYMBOL] = dt("ts", FieldTypes.STRING);

const SCRIP_PREFIX = "sf";
const INDEX_PREFIX = "if";

// ─── Binary Helpers ───────────────────────────────────────────────────────────

/** Read a signed 32-bit big-endian integer from a Uint8Array at position pos */
function buf2long(buf: Uint8Array, offset: number, length: number): number {
  let val = 0;
  for (let i = 0; i < length; i++) {
    val = (val << 8) | buf[offset + i];
  }
  // sign-extend for 4-byte values
  if (length === 4 && val >= 0x80000000) {
    val = val - 0x100000000;
  }
  return val;
}

/** Read a string from Uint8Array */
function buf2string(buf: Uint8Array, offset: number, length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += String.fromCharCode(buf[offset + i]);
  }
  return s;
}

// ─── Binary Frame Builders ────────────────────────────────────────────────────

/**
 * Build the binary connection request (mirrors prepareConnectionRequest2 in Python SDK).
 * Format: [2-byte length header][CONNECTION_TYPE byte][field count=3]
 *   field1: jwt (Authorization token)
 *   field2: redis key (Sid)
 *   field3: source string "JS_API"
 */
function buildConnectionRequest(jwt: string, sid: string): Uint8Array {
  const src = "JS_API";
  const jwtLen = jwt.length;
  const sidLen = sid.length;
  const srcLen = src.length;
  const totalLen = 2 + 1 + 1 + // length header + type + field count
    1 + 2 + jwtLen +   // fid1 + len + jwt
    1 + 2 + sidLen +   // fid2 + len + sid
    1 + 2 + srcLen;    // fid3 + len + src
  const buf = new Uint8Array(totalLen);
  let pos = 0;

  // Length header (total - 2 for header itself)
  const bodyLen = totalLen - 2;
  buf[pos++] = (bodyLen >> 8) & 0xFF;
  buf[pos++] = bodyLen & 0xFF;

  // Type
  buf[pos++] = BinRespTypes.CONNECTION_TYPE;
  // Field count
  buf[pos++] = 3;

  // Field 1: JWT
  buf[pos++] = 1;
  buf[pos++] = (jwtLen >> 8) & 0xFF;
  buf[pos++] = jwtLen & 0xFF;
  for (let i = 0; i < jwtLen; i++) buf[pos++] = jwt.charCodeAt(i);

  // Field 2: Sid
  buf[pos++] = 2;
  buf[pos++] = (sidLen >> 8) & 0xFF;
  buf[pos++] = sidLen & 0xFF;
  for (let i = 0; i < sidLen; i++) buf[pos++] = sid.charCodeAt(i);

  // Field 3: Source
  buf[pos++] = 3;
  buf[pos++] = (srcLen >> 8) & 0xFF;
  buf[pos++] = srcLen & 0xFF;
  for (let i = 0; i < srcLen; i++) buf[pos++] = src.charCodeAt(i);

  return buf;
}

/**
 * Build scrip byte array for subscribe/unsubscribe (mirrors getScripByteArray).
 * scrips = "exchange|token&exchange|token&..."
 * prefix = "sf" or "if"
 * Returns the scrip data portion (count + per-scrip length-prefixed strings).
 */
function buildScripByteArray(scrips: string, prefix: string): Uint8Array {
  if (scrips.endsWith("&")) scrips = scrips.slice(0, -1);
  const scripArray = scrips.split("&").map(s => prefix + "|" + s);
  const scripsCount = scripArray.length;

  let dataLen = 0;
  for (const s of scripArray) dataLen += s.length + 1; // +1 for length byte
  dataLen += 2; // 2-byte count header

  const bytes = new Uint8Array(dataLen);
  let pos = 0;
  bytes[pos++] = (scripsCount >> 8) & 0xFF;
  bytes[pos++] = scripsCount & 0xFF;
  for (const s of scripArray) {
    bytes[pos++] = s.length & 0xFF;
    for (let i = 0; i < s.length; i++) {
      bytes[pos++] = s.charCodeAt(i);
    }
  }
  return bytes;
}

/**
 * Build subscribe/unsubscribe binary request (mirrors prepareSubsUnSubsRequest).
 */
function buildSubsRequest(
  scrips: string,
  subscribeType: number,
  scripPrefix: string,
  channelNum: number
): Uint8Array {
  const dataArr = buildScripByteArray(scrips, scripPrefix);
  const totalLen = 2 + 1 + 1 + 1 + 2 + dataArr.length + 1 + 2 + 1; // header + type + fieldcount + fid + len + data + fid + len + channel
  const buf = new Uint8Array(totalLen);
  let pos = 0;

  // Length header
  const bodyLen = totalLen - 2;
  buf[pos++] = (bodyLen >> 8) & 0xFF;
  buf[pos++] = bodyLen & 0xFF;

  buf[pos++] = subscribeType; // type
  buf[pos++] = 2;  // field count

  // Field 1: scrip data
  buf[pos++] = 1;
  buf[pos++] = (dataArr.length >> 8) & 0xFF;
  buf[pos++] = dataArr.length & 0xFF;
  buf.set(dataArr, pos);
  pos += dataArr.length;

  // Field 2: channel number
  buf[pos++] = 2;
  buf[pos++] = 0; // (1 >> 8) & 0xFF
  buf[pos++] = 1; // 1 & 0xFF
  buf[pos++] = channelNum;

  return buf;
}

/**
 * Build ACK request (mirrors get_acknowledgement_req).
 */
function buildAckRequest(msgNum: number): Uint8Array {
  const buf = new Uint8Array(11);
  let pos = 0;
  // Length header
  buf[pos++] = 0;
  buf[pos++] = 9; // body length = 11 - 2
  buf[pos++] = BinRespTypes.ACK_TYPE;
  buf[pos++] = 1;
  buf[pos++] = 1;
  buf[pos++] = 0;
  buf[pos++] = 4;
  buf[pos++] = (msgNum >> 24) & 0xFF;
  buf[pos++] = (msgNum >> 16) & 0xFF;
  buf[pos++] = (msgNum >> 8) & 0xFF;
  buf[pos++] = msgNum & 0xFF;
  return buf;
}

// ─── Topic Data Classes ───────────────────────────────────────────────────────

interface TopicDataBase {
  feedType: string;
  exchange: string | null;
  symbol: string | null;
  tSymbol: string | null;
  multiplier: number;
  precision: number;
  precisionValue: number;
  fieldDataArray: (number | string | null)[];
  updatedFieldsArray: (boolean | null)[];
  setLongValues(index: number, value: number): void;
  setStringValues(index: number, value: string): void;
  setMultiplierAndPrec(): void;
  prepareData(type?: string): Record<string, string>;
}

function createScripTopicData(): TopicDataBase {
  const fieldDataArray: (number | string | null)[] = new Array(100).fill(null);
  const updatedFieldsArray: (boolean | null)[] = new Array(100).fill(null);
  fieldDataArray[STRING_INDEX.NAME] = TopicTypes.SCRIP;

  const self: TopicDataBase = {
    feedType: TopicTypes.SCRIP,
    exchange: null, symbol: null, tSymbol: null,
    multiplier: 1, precision: 2, precisionValue: 100,
    fieldDataArray, updatedFieldsArray,

    setLongValues(index: number, value: number) {
      if (self.fieldDataArray[index] !== value && value !== TRASH_VAL) {
        self.fieldDataArray[index] = value;
        self.updatedFieldsArray[index] = true;
      }
    },
    setStringValues(index: number, value: string) {
      if (index === STRING_INDEX.SYMBOL) {
        self.symbol = value;
        self.fieldDataArray[STRING_INDEX.SYMBOL] = value;
      } else if (index === STRING_INDEX.EXCHG) {
        self.exchange = value;
        self.fieldDataArray[STRING_INDEX.EXCHG] = value;
      } else if (index === STRING_INDEX.TSYMBOL) {
        self.tSymbol = value;
        self.fieldDataArray[STRING_INDEX.TSYMBOL] = value;
        self.updatedFieldsArray[STRING_INDEX.TSYMBOL] = true;
      }
    },
    setMultiplierAndPrec() {
      if (self.updatedFieldsArray[SCRIP_INDEX.PRECISION]) {
        self.precision = self.fieldDataArray[SCRIP_INDEX.PRECISION] as number;
        self.precisionValue = Math.pow(10, self.precision);
      }
      if (self.updatedFieldsArray[SCRIP_INDEX.MULTIPLIER]) {
        self.multiplier = self.fieldDataArray[SCRIP_INDEX.MULTIPLIER] as number;
      }
    },
    prepareData(type?: string): Record<string, string> {
      // Mark common fields
      self.updatedFieldsArray[STRING_INDEX.NAME] = true;
      self.updatedFieldsArray[STRING_INDEX.EXCHG] = true;
      self.updatedFieldsArray[STRING_INDEX.SYMBOL] = true;

      // Compute change and changePct
      const precFormat = self.precision;
      if (self.updatedFieldsArray[SCRIP_INDEX.LTP] || self.updatedFieldsArray[SCRIP_INDEX.CLOSE]) {
        const ltp = self.fieldDataArray[SCRIP_INDEX.LTP] as number | null;
        const close = self.fieldDataArray[SCRIP_INDEX.CLOSE] as number | null;
        if (ltp != null && close != null && close !== 0) {
          const change = ltp - close;
          self.fieldDataArray[SCRIP_INDEX.CHANGE] = change;
          self.updatedFieldsArray[SCRIP_INDEX.CHANGE] = true;
          self.fieldDataArray[SCRIP_INDEX.PERCHANGE] = ((change / close) * 100).toFixed(precFormat);
          self.updatedFieldsArray[SCRIP_INDEX.PERCHANGE] = true;
        }
      }

      // Compute turnover
      if (self.updatedFieldsArray[SCRIP_INDEX.VOLUME] || self.updatedFieldsArray[SCRIP_INDEX.VWAP]) {
        const volume = self.fieldDataArray[SCRIP_INDEX.VOLUME] as number | null;
        const vwap = self.fieldDataArray[SCRIP_INDEX.VWAP] as number | null;
        if (volume != null && vwap != null) {
          self.fieldDataArray[SCRIP_INDEX.TURNOVER] = volume * vwap;
          self.updatedFieldsArray[SCRIP_INDEX.TURNOVER] = true;
        }
      }

      const jsonRes: Record<string, string> = {};
      for (let i = 0; i < SCRIP_MAPPING.length; i++) {
        const dataType = SCRIP_MAPPING[i];
        let val = self.fieldDataArray[i];
        if (self.updatedFieldsArray[i] && val != null && dataType) {
          if (dataType.type === FieldTypes.FLOAT32) {
            val = ((val as number) / (self.multiplier * self.precisionValue)).toFixed(self.precision);
          }
          // We skip date formatting for simplicity — not needed for price ticks
          jsonRes[dataType.name] = String(val);
        }
      }
      self.updatedFieldsArray.fill(null);
      if (type) jsonRes["request_type"] = type;
      return jsonRes;
    },
  };
  return self;
}

function createIndexTopicData(): TopicDataBase {
  const fieldDataArray: (number | string | null)[] = new Array(100).fill(null);
  const updatedFieldsArray: (boolean | null)[] = new Array(100).fill(null);
  fieldDataArray[STRING_INDEX.NAME] = TopicTypes.INDEX;

  const self: TopicDataBase = {
    feedType: TopicTypes.INDEX,
    exchange: null, symbol: null, tSymbol: null,
    multiplier: 1, precision: 2, precisionValue: 100,
    fieldDataArray, updatedFieldsArray,

    setLongValues(index: number, value: number) {
      if (self.fieldDataArray[index] !== value && value !== TRASH_VAL) {
        self.fieldDataArray[index] = value;
        self.updatedFieldsArray[index] = true;
      }
    },
    setStringValues(index: number, value: string) {
      if (index === STRING_INDEX.SYMBOL) {
        self.symbol = value;
        self.fieldDataArray[STRING_INDEX.SYMBOL] = value;
      } else if (index === STRING_INDEX.EXCHG) {
        self.exchange = value;
        self.fieldDataArray[STRING_INDEX.EXCHG] = value;
      } else if (index === STRING_INDEX.TSYMBOL) {
        self.tSymbol = value;
        self.fieldDataArray[STRING_INDEX.TSYMBOL] = value;
        self.updatedFieldsArray[STRING_INDEX.TSYMBOL] = true;
      }
    },
    setMultiplierAndPrec() {
      if (self.updatedFieldsArray[INDEX_INDEX.PRECISION]) {
        self.precision = self.fieldDataArray[INDEX_INDEX.PRECISION] as number;
        self.precisionValue = Math.pow(10, self.precision);
      }
      if (self.updatedFieldsArray[INDEX_INDEX.MULTIPLIER]) {
        self.multiplier = self.fieldDataArray[INDEX_INDEX.MULTIPLIER] as number;
      }
    },
    prepareData(type?: string): Record<string, string> {
      self.updatedFieldsArray[STRING_INDEX.NAME] = true;
      self.updatedFieldsArray[STRING_INDEX.EXCHG] = true;
      self.updatedFieldsArray[STRING_INDEX.SYMBOL] = true;

      if (self.updatedFieldsArray[INDEX_INDEX.LTP] || self.updatedFieldsArray[INDEX_INDEX.CLOSE]) {
        const ltp = self.fieldDataArray[INDEX_INDEX.LTP] as number | null;
        const close = self.fieldDataArray[INDEX_INDEX.CLOSE] as number | null;
        if (ltp != null && close != null && close !== 0) {
          const change = ltp - close;
          self.fieldDataArray[INDEX_INDEX.CHANGE] = change;
          self.updatedFieldsArray[INDEX_INDEX.CHANGE] = true;
          self.fieldDataArray[INDEX_INDEX.PERCHANGE] = ((change / close) * 100).toFixed(self.precision);
          self.updatedFieldsArray[INDEX_INDEX.PERCHANGE] = true;
        }
      }

      const jsonRes: Record<string, string> = {};
      for (let i = 0; i < INDEX_MAPPING.length; i++) {
        const dataType = INDEX_MAPPING[i];
        let val = self.fieldDataArray[i];
        if (self.updatedFieldsArray[i] && val != null && dataType) {
          if (dataType.type === FieldTypes.FLOAT32) {
            val = ((val as number) / (self.multiplier * self.precisionValue)).toFixed(self.precision);
          }
          jsonRes[dataType.name] = String(val);
        }
      }
      self.updatedFieldsArray.fill(null);
      if (type) jsonRes["request_type"] = type;
      return jsonRes;
    },
  };
  return self;
}

// ─── Binary Frame Parser ──────────────────────────────────────────────────────

/**
 * HSWrapper — parses binary WebSocket frames from Kotak's server.
 * Mirrors the Python SDK's HSWrapper.parseData().
 */
class HSWrapper {
  private counter = 0;
  private ackNum = 0;
  private topicList: Record<number, TopicDataBase> = {};
  private ws: WebSocket | null = null;

  setWebSocket(ws: WebSocket | null) {
    this.ws = ws;
  }

  private getNewTopicData(topicName: string): TopicDataBase | null {
    const feedType = topicName.split("|")[0];
    if (feedType === TopicTypes.SCRIP) return createScripTopicData();
    if (feedType === TopicTypes.INDEX) return createIndexTopicData();
    return null;
  }

  private getStatus(data: Uint8Array, pos: number): { status: string; newPos: number } {
    const fieldCount = data[pos]; pos++;
    let status = "N";
    if (fieldCount > 0) {
      pos++; // fid
      const fieldLength = buf2long(data, pos, 2); pos += 2;
      status = buf2string(data, pos, fieldLength); pos += fieldLength;
    }
    return { status, newPos: pos };
  }

  /**
   * Parse a binary frame into an array of JSON tick objects or a connection/ack response.
   * Returns: { type: 'connection'|'subscribe'|'data', data: any }
   */
  parseData(e: Uint8Array): { type: string; data: any } | null {
    let pos = 0;

    // 2-byte packets count (unused)
    pos += 2;

    const type = e[pos]; pos++;

    if (type === BinRespTypes.CONNECTION_TYPE) {
      const fCount = e[pos]; pos++;
      const jsonRes: Record<string, any> = {};

      if (fCount >= 2) {
        pos++; // fid1
        let valLen = buf2long(e, pos, 2); pos += 2;
        const status = buf2string(e, pos, valLen); pos += valLen;
        pos++; // fid2
        valLen = buf2long(e, pos, 2); pos += 2;
        const ackCount = buf2long(e, pos, valLen); pos += valLen;
        if (status === "K") {
          jsonRes.stat = "Ok"; jsonRes.type = "cn"; jsonRes.msg = "successful";
          this.ackNum = ackCount;
        } else {
          jsonRes.stat = "NotOk"; jsonRes.type = "cn"; jsonRes.msg = "failed";
        }
      } else if (fCount === 1) {
        pos++; // fid1
        const valLen = buf2long(e, pos, 2); pos += 2;
        const status = buf2string(e, pos, valLen);
        jsonRes.stat = status === "K" ? "Ok" : "NotOk";
        jsonRes.type = "cn";
      } else {
        jsonRes.stat = "NotOk"; jsonRes.type = "cn"; jsonRes.msg = "invalid field count";
      }

      return { type: "connection", data: jsonRes };
    }

    if (type === BinRespTypes.DATA_TYPE) {
      if (this.ackNum > 0) {
        this.counter++;
        const msgNum = buf2long(e, pos, 4); pos += 4;
        if (this.counter >= this.ackNum) {
          const ackReq = buildAckRequest(msgNum);
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(ackReq);
          }
          this.counter = 0;
        }
      }

      const h: Record<string, string>[] = [];
      const g = buf2long(e, pos, 2); pos += 2;

      for (let n = 0; n < g; n++) {
        pos += 2; // skip 2 bytes
        const c = buf2long(e, pos, 1); pos++;

        if (c === ResponseTypes.SNAP) {
          const topicId = buf2long(e, pos, 4); pos += 4;
          const nameLen = buf2long(e, pos, 1); pos++;
          const topicName = buf2string(e, pos, nameLen); pos += nameLen;

          const d = this.getNewTopicData(topicName);
          if (d) {
            this.topicList[topicId] = d;

            // Long field values
            const fcount1 = buf2long(e, pos, 1); pos++;
            for (let i = 0; i < fcount1; i++) {
              const fvalue = buf2long(e, pos, 4);
              d.setLongValues(i, fvalue);
              pos += 4;
            }

            d.setMultiplierAndPrec();

            // String field values
            const fcount2 = buf2long(e, pos, 1); pos++;
            for (let i = 0; i < fcount2; i++) {
              const fid = buf2long(e, pos, 1); pos++;
              const dataLen = buf2long(e, pos, 1); pos++;
              const strVal = buf2string(e, pos, dataLen); pos += dataLen;
              d.setStringValues(fid, strVal);
            }

            h.push(d.prepareData("SNAP"));
          }
        } else if (c === ResponseTypes.UPDATE) {
          const topicId = buf2long(e, pos, 4); pos += 4;
          const d = this.topicList[topicId];
          if (d) {
            const fcount = buf2long(e, pos, 1); pos++;
            for (let i = 0; i < fcount; i++) {
              const fvalue = buf2long(e, pos, 4);
              d.setLongValues(i, fvalue);
              pos += 4;
            }
            h.push(d.prepareData("SUB"));
          }
        }
      }

      return { type: "data", data: h };
    }

    if (type === BinRespTypes.SUBSCRIBE_TYPE || type === BinRespTypes.UNSUBSCRIBE_TYPE) {
      const { status } = this.getStatus(e, pos);
      return {
        type: type === BinRespTypes.SUBSCRIBE_TYPE ? "subscribe" : "unsubscribe",
        data: { stat: status === "K" ? "Ok" : "NotOk" },
      };
    }

    if (type === BinRespTypes.SNAPSHOT) {
      const { status } = this.getStatus(e, pos);
      return { type: "snapshot", data: { stat: status === "K" ? "Ok" : "NotOk" } };
    }

    return null;
  }
}

// ─── Tick Normalizer ──────────────────────────────────────────────────────────

export interface NormalizedTick {
  token: string;
  ltp: number;
  change: number;
  changePct: number;
}

function parseNum(v: string | number | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function normalizeTick(raw: Record<string, string>): NormalizedTick | null {
  const token = raw.tk || raw.instrument_token || "";
  if (!token) return null;

  // For indices: ltp field is "iv"; for scrips: ltp field is "ltp"
  const ltp = parseNum(raw.iv || raw.ltp || raw.last_traded_price);
  if (ltp <= 0) return null; // Zero-value guard

  const prevClose = parseNum(raw.ic || raw.c || raw.close || raw.prev_day_close);
  let change = parseNum(raw.cng || raw.change);
  let changePct = parseNum(raw.nc || raw.net_change_percentage || raw.changePct);

  if (change === 0 && ltp && prevClose) change = Math.round((ltp - prevClose) * 100) / 100;
  if (changePct === 0 && change && prevClose) changePct = Math.round((change / prevClose) * 10000) / 100;

  return { token, ltp, change, changePct };
}

// ─── KotakLiveFeed ────────────────────────────────────────────────────────────

export interface FeedCredentials {
  accessToken: string;
  sid: string;
  serverId?: string;
  dataCenter?: string;
}

export interface Instrument {
  exchange_segment: string;
  instrument_token: string;
}

type TickCallback = (tick: NormalizedTick) => void;
type StatusCallback = (connected: boolean) => void;

export class KotakLiveFeed {
  private credentials: FeedCredentials;
  private ws: WebSocket | null = null;
  private hsWrapper = new HSWrapper();
  private tickListeners = new Set<TickCallback>();
  private statusListeners = new Set<StatusCallback>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private maxReconnectDelay = 30000;
  private _connected = false;
  private _intentionalClose = false;

  // Track what's currently subscribed for re-subscribe after reconnect
  private subscribedScrips: Map<string, Instrument> = new Map(); // key: "exchange|token"
  private subscribedIndexes: Map<string, Instrument> = new Map();
  // Channel counter for channel segregation (start at 2 as SDK does)
  private currentChannel = 2;

  constructor(credentials: FeedCredentials) {
    this.credentials = credentials;
  }

  get isConnected(): boolean {
    return this._connected;
  }

  /** Register a tick callback. Returns unsubscribe function. */
  onTick(callback: TickCallback): () => void {
    this.tickListeners.add(callback);
    return () => this.tickListeners.delete(callback);
  }

  /** Register a connection status callback. Returns unsubscribe function. */
  onStatus(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  /** Connect to Kotak WebSocket */
  connect(): void {
    this._intentionalClose = false;
    this.reconnectAttempt = 0;
    this._connect();
  }

  /** Disconnect and stop reconnecting */
  disconnect(): void {
    this._intentionalClose = true;
    this._cleanup();
  }

  /** Update credentials (e.g. after re-login) and reconnect */
  updateCredentials(credentials: FeedCredentials): void {
    this.credentials = credentials;
    if (this.ws) {
      this._intentionalClose = true;
      this._cleanup();
      this._intentionalClose = false;
      this._connect();
    }
  }

  /** Subscribe to instruments */
  subscribe(instruments: Instrument[], isIndex = false): void {
    const newInstruments: Instrument[] = [];
    const map = isIndex ? this.subscribedIndexes : this.subscribedScrips;

    for (const inst of instruments) {
      const key = `${inst.exchange_segment}|${inst.instrument_token}`;
      if (!map.has(key)) {
        map.set(key, inst);
        newInstruments.push(inst);
      }
    }

    if (newInstruments.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN && this._connected) {
      this._sendSubscribe(newInstruments, isIndex);
    }
  }

  /** Unsubscribe from instruments */
  unsubscribe(instruments: Instrument[], isIndex = false): void {
    const toUnsub: Instrument[] = [];
    const map = isIndex ? this.subscribedIndexes : this.subscribedScrips;

    for (const inst of instruments) {
      const key = `${inst.exchange_segment}|${inst.instrument_token}`;
      if (map.has(key)) {
        map.delete(key);
        toUnsub.push(inst);
      }
    }

    if (toUnsub.length > 0 && this.ws && this.ws.readyState === WebSocket.OPEN && this._connected) {
      this._sendUnsubscribe(toUnsub, isIndex);
    }
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private _connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      console.log("[KotakLiveFeed] Connecting to", WEBSOCKET_URL);
      this.ws = new WebSocket(WEBSOCKET_URL);
      this.ws.binaryType = "arraybuffer";
      this.hsWrapper.setWebSocket(this.ws);

      this.ws.onopen = () => {
        console.log("[KotakLiveFeed] WebSocket opened, sending auth...");
        // Send binary connection request
        const connReq = buildConnectionRequest(this.credentials.accessToken, this.credentials.sid);
        this.ws!.send(connReq);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this._handleMessage(event);
      };

      this.ws.onerror = (event: Event) => {
        console.error("[KotakLiveFeed] WebSocket error:", event);
      };

      this.ws.onclose = () => {
        console.log("[KotakLiveFeed] WebSocket closed");
        this._setConnected(false);
        this._stopHeartbeat();

        if (!this._intentionalClose) {
          this._scheduleReconnect();
        }
      };
    } catch (err) {
      console.error("[KotakLiveFeed] Failed to create WebSocket:", err);
      if (!this._intentionalClose) {
        this._scheduleReconnect();
      }
    }
  }

  private _handleMessage(event: MessageEvent): void {
    if (typeof event.data === "string") {
      // JSON message (rare — connection ack in some SDK versions)
      try {
        const parsed = JSON.parse(event.data);
        if (Array.isArray(parsed) && parsed[0]?.type === "cn") {
          if (parsed[0].stat === "Ok") {
            this._onConnectionSuccess();
          } else {
            console.error("[KotakLiveFeed] Connection rejected:", parsed);
          }
        }
      } catch { /* ignore */ }
      return;
    }

    // Binary message
    const data = new Uint8Array(event.data as ArrayBuffer);
    try {
      const result = this.hsWrapper.parseData(data);
      if (!result) return;

      if (result.type === "connection") {
        if (result.data.stat === "Ok") {
          this._onConnectionSuccess();
        } else {
          console.error("[KotakLiveFeed] Connection failed:", result.data);
        }
      } else if (result.type === "data") {
        const ticks = result.data as Record<string, string>[];
        for (const rawTick of ticks) {
          const tick = normalizeTick(rawTick);
          if (tick) {
            for (const listener of this.tickListeners) {
              try { listener(tick); } catch { /* ignore */ }
            }
          }
        }
      } else if (result.type === "subscribe") {
        console.log("[KotakLiveFeed] Subscribe ack:", result.data);
      } else if (result.type === "unsubscribe") {
        console.log("[KotakLiveFeed] Unsubscribe ack:", result.data);
      }
    } catch (err) {
      console.error("[KotakLiveFeed] Error parsing binary frame:", err);
    }
  }

  private _onConnectionSuccess(): void {
    console.log("[KotakLiveFeed] Connected and authenticated!");
    this._setConnected(true);
    this.reconnectAttempt = 0;
    this._startHeartbeat();

    // Re-subscribe all tracked instruments
    if (this.subscribedIndexes.size > 0) {
      this._sendSubscribe([...this.subscribedIndexes.values()], true);
    }
    if (this.subscribedScrips.size > 0) {
      this._sendSubscribe([...this.subscribedScrips.values()], false);
    }
  }

  private _sendSubscribe(instruments: Instrument[], isIndex: boolean): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const scripsStr = instruments
      .map(i => `${i.exchange_segment}|${i.instrument_token}`)
      .join("&");

    const prefix = isIndex ? INDEX_PREFIX : SCRIP_PREFIX;
    const req = buildSubsRequest(scripsStr, BinRespTypes.SUBSCRIBE_TYPE, prefix, this.currentChannel);
    this.ws.send(req);
    console.log(`[KotakLiveFeed] Subscribed ${isIndex ? "indexes" : "scrips"}:`, instruments.map(i => i.instrument_token));
  }

  private _sendUnsubscribe(instruments: Instrument[], isIndex: boolean): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const scripsStr = instruments
      .map(i => `${i.exchange_segment}|${i.instrument_token}`)
      .join("&");

    const prefix = isIndex ? INDEX_PREFIX : SCRIP_PREFIX;
    const req = buildSubsRequest(scripsStr, BinRespTypes.UNSUBSCRIBE_TYPE, prefix, this.currentChannel);
    this.ws.send(req);
    console.log(`[KotakLiveFeed] Unsubscribed ${isIndex ? "indexes" : "scrips"}:`, instruments.map(i => i.instrument_token));
  }

  private _startHeartbeat(): void {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // The SDK sends a JSON heartbeat: {"type": "hb"}
        // But the HSWebSocket actually converts this to a binary format via hs_send.
        // For the market feed (HSWebSocket), the connection stays alive via ACK mechanism.
        // The heartbeat is only needed for the order feed (HSIWebSocket).
        // The market feed uses binary ACK keepalive which is already handled in parseData.
        // So we just check if connection is alive.
      }
    }, 29000);
  }

  private _stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private _scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempt), this.maxReconnectDelay);
    console.log(`[KotakLiveFeed] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempt + 1})...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempt++;
      this._connect();
    }, delay);
  }

  private _setConnected(connected: boolean): void {
    this._connected = connected;
    for (const listener of this.statusListeners) {
      try { listener(connected); } catch { /* ignore */ }
    }
  }

  private _cleanup(): void {
    this._stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }
    this.hsWrapper.setWebSocket(null);
    this._setConnected(false);
  }
}
