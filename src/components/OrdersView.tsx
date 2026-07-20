import React, { useState } from "react";
import {
  BookOpen,
  Clock,
  RefreshCw,
  Edit3,
  Ban,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { TradeOrder } from "../types";

interface OrdersViewProps {
  orders: TradeOrder[];
  loadingOrders: boolean;
  onFetchOrders: () => void;
  syncingOrders: boolean;
  onSyncOrderStatus: () => void;
  cancellingOrderId: string | null;
  onCancelOrder: (orderId: string) => void;
  onOpenEditModal: (order: TradeOrder) => void;
  onDeleteOrderRecord: (orderId: string) => void;
  onClearAllOrderLogs: () => void;
  modifyingOrderId: string | null;
}

export function OrdersView({
  orders,
  loadingOrders,
  onFetchOrders,
  syncingOrders,
  onSyncOrderStatus,
  cancellingOrderId,
  onCancelOrder,
  onOpenEditModal,
  onDeleteOrderRecord,
  onClearAllOrderLogs,
}: OrdersViewProps) {
  const [ordersSubTab, setOrdersSubTab] = useState<"pending" | "completed">("pending");
  const [expandedMasterOrders, setExpandedMasterOrders] = useState<Record<string, boolean>>({});

  const toggleMasterExpand = (id: string) =>
    setExpandedMasterOrders((prev) => ({ ...prev, [id]: !prev[id] }));

  // Separate pending vs completed/cancelled master orders
  const pendingMasterOrders = orders.filter(
    (o) => o.accountRole === "master" && o.status === "PENDING"
  );
  const completedMasterOrders = orders.filter(
    (o) => o.accountRole === "master" && o.status !== "PENDING"
  );

  const getSlavesForMaster = (masterId: string) =>
    orders.filter((o) => o.masterOrderId === masterId);

  return (
    <div className="space-y-6">
      {/* Header Controls & Sub-tabs */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3.5 sm:p-4 backdrop-blur-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setOrdersSubTab("pending")}
            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              ordersSubTab === "pending"
                ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending ({pendingMasterOrders.length})</span>
          </button>

          <button
            onClick={() => setOrdersSubTab("completed")}
            className={`flex-1 sm:flex-none px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              ordersSubTab === "completed"
                ? "bg-teal-500 text-slate-950 shadow-lg shadow-teal-500/20"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Log Tree ({completedMasterOrders.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={onSyncOrderStatus}
            disabled={syncingOrders}
            className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingOrders ? "animate-spin" : ""}`} />
            <span>{syncingOrders ? "Syncing..." : "Sync Broker"}</span>
          </button>

          <button
            onClick={onFetchOrders}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingOrders ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>

          {ordersSubTab === "completed" && completedMasterOrders.length > 0 && (
            <button
              onClick={onClearAllOrderLogs}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Order Content */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-sm min-h-[460px]">
        {ordersSubTab === "pending" ? (
          // Pending Orders Sub-tab
          <div>
            {loadingOrders ? (
              <div className="text-center py-16 text-slate-500 text-xs animate-pulse">
                Loading pending orders...
              </div>
            ) : pendingMasterOrders.length === 0 ? (
              <div className="text-center py-16 sm:py-20 text-slate-500 text-xs space-y-2 px-4">
                <Clock className="w-10 h-10 mx-auto text-slate-700 opacity-50" />
                <p className="font-semibold text-slate-400">No Pending Orders</p>
                <p className="text-[11px] text-slate-600 max-w-sm mx-auto">
                  Pending LIMIT and SL orders waiting for broker execution will appear here with inline edit and cancel features.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingMasterOrders.map((mOrder) => {
                  const slaves = getSlavesForMaster(mOrder.id);
                  const isExpanded = !!expandedMasterOrders[mOrder.id];

                  return (
                    <div
                      key={mOrder.id}
                      className="border border-amber-500/20 rounded-xl overflow-hidden bg-slate-900/50"
                    >
                      <div className="p-3.5 sm:p-4 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              mOrder.transactionType === "BUY"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            <span className="text-xs font-black uppercase tracking-wider font-mono">
                              {mOrder.transactionType}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-100 font-mono">
                                {mOrder.symbol}
                              </h4>
                              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                                [{mOrder.instrument} | {mOrder.orderType}]
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1 font-mono">
                              <span>
                                Qty: <strong className="text-slate-200">{mOrder.quantity}</strong>
                              </span>
                              <span>
                                Price:{" "}
                                <strong className="text-slate-200">
                                  {mOrder.orderType === "SL"
                                    ? `₹${mOrder.price} (Trig: ₹${mOrder.triggerPrice})`
                                    : mOrder.price === 0
                                    ? "MARKET"
                                    : `₹${mOrder.price}`}
                                </strong>
                              </span>
                              <span>
                                Master: <strong className="text-teal-400">{mOrder.accountName}</strong>
                              </span>
                              <span>
                                Time:{" "}
                                <strong>
                                  {new Date(mOrder.timestamp).toLocaleTimeString()}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                          <span className="px-2 py-1 rounded text-[10px] sm:text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse font-mono">
                            PENDING
                          </span>

                          <button
                            onClick={() => onOpenEditModal(mOrder)}
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 transition"
                            title="Edit Order before execution"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => onCancelOrder(mOrder.id)}
                            disabled={cancellingOrderId === mOrder.id}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 transition disabled:opacity-50"
                            title="Cancel this order"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{cancellingOrderId === mOrder.id ? "..." : "Cancel"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Replicated Slave Accounts */}
                      {slaves.length > 0 && (
                        <div className="border-t border-slate-800 bg-slate-950/40 p-3 space-y-2">
                          <div className="flex items-center justify-between text-[10px] uppercase font-extrabold tracking-wider text-slate-500 font-mono">
                            <span>Slave Account Replications ({slaves.length})</span>
                            <button
                              onClick={() => toggleMasterExpand(mOrder.id)}
                              className="text-slate-400 hover:text-white flex items-center gap-1"
                            >
                              <span>{isExpanded ? "Hide" : "Show"}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="space-y-1.5">
                              {slaves.map((sOrder) => (
                                <div
                                  key={sOrder.id}
                                  className="px-3 py-2 bg-slate-900/60 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-300 font-mono">
                                      {sOrder.accountName}
                                    </span>
                                    <span className="text-slate-600">|</span>
                                    <span className="text-slate-400 font-mono">
                                      Qty: <strong className="text-slate-200">{sOrder.quantity}</strong>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 justify-end">
                                    {sOrder.errorMessage && (
                                      <span
                                        className="text-rose-400 text-[10px] font-mono truncate max-w-[180px]"
                                        title={sOrder.errorMessage}
                                      >
                                        {sOrder.errorMessage}
                                      </span>
                                    )}
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        sOrder.status === "SUCCESS"
                                          ? "bg-emerald-500/10 text-emerald-400"
                                          : sOrder.status === "PENDING"
                                          ? "bg-amber-500/10 text-amber-400 animate-pulse"
                                          : "bg-rose-500/10 text-rose-400"
                                      }`}
                                    >
                                      {sOrder.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // Completed / Cancelled Sub-tab
          <div>
            {loadingOrders ? (
              <div className="text-center py-16 text-slate-500 text-xs animate-pulse">
                Loading order history logs...
              </div>
            ) : completedMasterOrders.length === 0 ? (
              <div className="text-center py-16 sm:py-20 text-slate-500 text-xs space-y-2 px-4">
                <BookOpen className="w-10 h-10 mx-auto text-slate-700 opacity-50" />
                <p className="font-semibold text-slate-400">No Execution History</p>
                <p className="text-[11px] text-slate-600 max-w-sm mx-auto">
                  Executed, cancelled, and filled order histories across all master and slave accounts will be logged here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {completedMasterOrders.map((mOrder) => {
                  const slaves = getSlavesForMaster(mOrder.id);
                  const isExpanded = !!expandedMasterOrders[mOrder.id];
                  const hasFailedSlaves = slaves.some((s) => s.status === "FAILED");

                  return (
                    <div
                      key={mOrder.id}
                      className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50"
                    >
                      <div className="p-3.5 sm:p-4 bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`p-2 rounded-xl shrink-0 ${
                              mOrder.transactionType === "BUY"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            <span className="text-xs font-black uppercase tracking-wider font-mono">
                              {mOrder.transactionType}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-100 font-mono">
                                {mOrder.symbol}
                              </h4>
                              <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded font-mono">
                                [{mOrder.instrument} | {mOrder.orderType}]
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-1 font-mono">
                              <span>
                                Qty: <strong className="text-slate-200">{mOrder.quantity}</strong>
                              </span>
                              <span>
                                Price:{" "}
                                <strong className="text-slate-200">
                                  {mOrder.price === 0 ? "MARKET" : `₹${mOrder.price}`}
                                </strong>
                              </span>
                              <span>
                                Master: <strong className="text-teal-400">{mOrder.accountName}</strong>
                              </span>
                              <span>
                                Time:{" "}
                                <strong>
                                  {new Date(mOrder.timestamp).toLocaleTimeString()}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] sm:text-xs font-bold font-mono ${
                              mOrder.status === "SUCCESS"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : mOrder.status === "CANCELLED"
                                ? "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {mOrder.status}
                          </span>

                          <button
                            onClick={() => toggleMasterExpand(mOrder.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                          >
                            <span>Copies ({slaves.length})</span>
                            {hasFailedSlaves && (
                              <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                            )}
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => onDeleteOrderRecord(mOrder.id)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 rounded-lg cursor-pointer"
                            title="Delete log record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Replication Details */}
                      {isExpanded && (
                        <div className="border-t border-slate-800 bg-slate-950/40 p-3 space-y-2">
                          <div className="text-[10px] uppercase font-extrabold tracking-wider text-slate-500 font-mono">
                            Slave Account Replications
                          </div>
                          {slaves.length === 0 ? (
                            <div className="text-xs text-slate-500 text-center py-2">
                              No copies recorded for this order.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {slaves.map((sOrder) => (
                                <div
                                  key={sOrder.id}
                                  className="px-3 py-2 bg-slate-900/60 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-300 font-mono">
                                      {sOrder.accountName}
                                    </span>
                                    <span className="text-slate-600">|</span>
                                    <span className="text-slate-400 font-mono">
                                      Qty: <strong className="text-slate-200">{sOrder.quantity}</strong>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 justify-end">
                                    {sOrder.errorMessage && (
                                      <span
                                        className="text-rose-400 text-[10px] font-mono truncate max-w-[200px]"
                                        title={sOrder.errorMessage}
                                      >
                                        ({sOrder.errorMessage})
                                      </span>
                                    )}
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        sOrder.status === "SUCCESS"
                                          ? "bg-emerald-500/10 text-emerald-400"
                                          : sOrder.status === "CANCELLED"
                                          ? "bg-slate-500/10 text-slate-400"
                                          : "bg-rose-500/10 text-rose-400"
                                      }`}
                                    >
                                      {sOrder.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
