import { useState } from "react";

function RecordsTable({
  records,
  selectedIds,
  setSelectedIds,
  onSelectRecord,
  updateStatus,
  deleteRecord
}) {
  const isAllSelected = records.length > 0 && selectedIds.length === records.length;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(records.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="mt-8 backdrop-blur-2xl bg-white/5 border border-white/10 rounded-2xl shadow-xl p-6 overflow-x-auto max-h-[600px] overflow-y-auto relative">
      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Ingested Records
            </h2>
            <p className="text-gray-400 mt-1 text-sm">
              Manage data ingestion, view audit logs, and correct anomalies.
            </p>
          </div>
          <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-4 py-2 rounded-xl">
            <span className="text-xs text-gray-400 block uppercase font-semibold">Total Records</span>
            <span className="text-lg font-bold">{records.length}</span>
          </div>
        </div>

        {/* Empty State */}
        {records.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-4">
              <span className="text-2xl text-gray-400">Folder</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Records Available</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              Please upload a CSV file matching one of the supported source types to begin.
            </p>
          </div>
        )}

        {/* Table */}
        {records.length > 0 && (
          <table className="w-full border-collapse text-sm text-left">
            <thead>
              <tr className="border-b border-white/10 text-cyan-400 font-semibold">
                <th className="p-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                  />
                </th>
                <th className="p-4">ID</th>
                <th className="p-4">Source Type</th>
                <th className="p-4">Classification</th>
                <th className="p-4">Status</th>
                <th className="p-4">Calculated Footprint</th>
                <th className="p-4">Posting Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const isSelected = selectedIds.includes(record.id);
                return (
                  <tr
                    key={record.id}
                    className={`border-b border-white/5 transition-colors duration-200 hover:bg-white/5 ${
                      isSelected ? "bg-white/5" : ""
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(record.id)}
                        className="w-4 h-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                      />
                    </td>

                    {/* ID */}
                    <td className="p-4 font-mono text-white font-medium">
                      #{record.id}
                    </td>

                    {/* Source */}
                    <td className="p-4">
                      <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-1 rounded-full text-xs font-semibold">
                        {record.source_type}
                      </span>
                    </td>

                    {/* Scope */}
                    <td className="p-4 text-gray-300">
                      {record.scope === "SCOPE_1" && "Scope 1 (Direct)"}
                      {record.scope === "SCOPE_2" && "Scope 2 (Indirect)"}
                      {record.scope === "SCOPE_3" && "Scope 3 (Corporate Travel)"}
                      {!record.scope && "Unclassified"}
                    </td>

                    {/* Status */}
                    <td className="p-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          record.status === "PENDING"
                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            : record.status === "APPROVED"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : record.status === "SUSPICIOUS"
                            ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                            : record.status === "REJECTED"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>

                    {/* Footprint */}
                    <td className="p-4 font-semibold text-white">
                      {record.co2e_kg !== null && record.co2e_kg !== undefined ? (
                        <span>{record.co2e_kg.toLocaleString()} kg CO2e</span>
                      ) : (
                        <span className="text-gray-500 font-normal">Pending calculation</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="p-4 text-gray-400">
                      {record.date || record.billing_start_date || "N/A"}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onSelectRecord(record)}
                          className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-3 py-1 rounded-lg transition-all duration-200 text-xs shadow-md"
                        >
                          Review & Edit
                        </button>
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 px-3 py-1 rounded-lg transition-all duration-200 text-xs"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default RecordsTable;