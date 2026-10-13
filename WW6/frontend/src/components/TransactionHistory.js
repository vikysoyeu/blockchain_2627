import React, { useState } from "react";

export function TransactionHistory({
  history = [],
  currentAddress = "",
  tokenSymbol = "MHT",
  onRefresh,
  isLoading = false,
}) {
  const [filter, setFilter] = useState("all");

  const normalizedCurrentAddress = currentAddress.toLowerCase();

  const filteredHistory = history.filter((tx) => {
    const isSent = tx.from.toLowerCase() === normalizedCurrentAddress;
    const isReceived = tx.to.toLowerCase() === normalizedCurrentAddress;

    if (filter === "sent") return isSent;
    if (filter === "received") return isReceived;
    return true; // 'all'
  });

  const sentCount = history.filter(
    (tx) => tx.from.toLowerCase() === normalizedCurrentAddress
  ).length;

  const receivedCount = history.filter(
    (tx) => tx.to.toLowerCase() === normalizedCurrentAddress
  ).length;

  const truncateAddress = (addr) => {
    if (!addr) return "";
    if (addr === "0x0000000000000000000000000000000000000000") {
      return "0x0 (Mint / Initial)";
    }
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <div className="card shadow-sm mt-4">
      <div className="card-header d-flex justify-content-between align-items-center bg-light">
        <h5 className="mb-0">
          📜 Lịch Sử Gửi & Nhận Token ({tokenSymbol})
        </h5>
        <div>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={onRefresh}
            disabled={isLoading}
            title="Làm mới lịch sử"
          >
            {isLoading ? "Đang tải..." : "🔄 Làm mới"}
          </button>
        </div>
      </div>

      <div className="card-body">
        {/* Bộ lọc filter */}
        <div className="btn-group mb-3" role="group">
          <button
            type="button"
            className={`btn btn-sm ${
              filter === "all" ? "btn-primary" : "btn-outline-primary"
            }`}
            onClick={() => setFilter("all")}
          >
            Tất cả ({history.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              filter === "sent" ? "btn-danger" : "btn-outline-danger"
            }`}
            onClick={() => setFilter("sent")}
          >
            Đã gửi ({sentCount})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              filter === "received" ? "btn-success" : "btn-outline-success"
            }`}
            onClick={() => setFilter("received")}
          >
            Đã nhận ({receivedCount})
          </button>
        </div>

        {/* Bảng hiển thị giao dịch */}
        {filteredHistory.length === 0 ? (
          <div className="alert alert-info mb-0 text-center">
            {history.length === 0
              ? "Chưa có giao dịch gửi/nhận token nào."
              : "Không có giao dịch nào khớp với bộ lọc đã chọn."}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover table-bordered mb-0">
              <thead className="thead-light">
                <tr>
                  <th scope="col" style={{ width: "120px" }}>Loại</th>
                  <th scope="col">Từ (From)</th>
                  <th scope="col">Đến (To)</th>
                  <th scope="col" className="text-right">Số lượng</th>
                  <th scope="col" className="text-center">Block</th>
                  <th scope="col">Tx Hash</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((tx, idx) => {
                  const isSent =
                    tx.from.toLowerCase() === normalizedCurrentAddress;
                  const isReceived =
                    tx.to.toLowerCase() === normalizedCurrentAddress;

                  let badgeClass = "badge-secondary";
                  let typeLabel = "Chuyển tiền";
                  let amountPrefix = "";
                  let amountClass = "";

                  if (isSent && isReceived) {
                    badgeClass = "badge-warning";
                    typeLabel = "Tự gửi";
                    amountPrefix = "±";
                    amountClass = "text-warning";
                  } else if (isSent) {
                    badgeClass = "badge-danger";
                    typeLabel = "Đã gửi";
                    amountPrefix = "-";
                    amountClass = "text-danger font-weight-bold";
                  } else if (isReceived) {
                    badgeClass = "badge-success";
                    typeLabel = "Đã nhận";
                    amountPrefix = "+";
                    amountClass = "text-success font-weight-bold";
                  }

                  return (
                    <tr key={tx.txHash ? `${tx.txHash}-${idx}` : idx}>
                      <td>
                        <span className={`badge ${badgeClass} p-2`}>
                          {typeLabel}
                        </span>
                      </td>
                      <td>
                        <span
                          title={tx.from}
                          className={
                            isSent ? "font-weight-bold text-danger" : ""
                          }
                        >
                          {truncateAddress(tx.from)}
                          {isSent && " (Bạn)"}
                        </span>
                      </td>
                      <td>
                        <span
                          title={tx.to}
                          className={
                            isReceived ? "font-weight-bold text-success" : ""
                          }
                        >
                          {truncateAddress(tx.to)}
                          {isReceived && " (Bạn)"}
                        </span>
                      </td>
                      <td className={`text-right ${amountClass}`}>
                        {amountPrefix}
                        {tx.value} {tokenSymbol}
                      </td>
                      <td className="text-center">
                        <span className="badge badge-light">
                          #{tx.blockNumber}
                        </span>
                      </td>
                      <td>
                        <span
                          className="font-monospace text-muted small"
                          title={tx.txHash}
                        >
                          {tx.txHash
                            ? `${tx.txHash.substring(0, 10)}...${tx.txHash.substring(
                                tx.txHash.length - 8
                              )}`
                            : "N/A"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

