import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiUploadCloud, FiSearch, FiEdit, FiCheck, FiX, FiClock, FiAlertCircle } from "react-icons/fi";
import UploadCard from "../components/UploadCard";
import RecordsTable from "../components/RecordsTable";
import { API_BASE } from "../utils/api";

function Dashboard() {
  const navigate = useNavigate();

  const username = localStorage.getItem("username") || "Analyst";
  const email = localStorage.getItem("email") || "";
  const token = localStorage.getItem("token");
  const organization = localStorage.getItem("organization") || "Default Organization";

  // Data State
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    total_co2e_kg: 0,
    scope_breakdown: { SCOPE_1: 0, SCOPE_2: 0, SCOPE_3: 0 },
    location_breakdown: [],
    monthly_breakdown: [],
    status_counts: { PENDING: 0, APPROVED: 0, REJECTED: 0, SUSPICIOUS: 0, FAILED: 0 }
  });

  // UI State
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [sourceType, setSourceType] = useState("SAP");

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Selection & Detail Review State
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeRecord, setActiveRecord] = useState(null);
  const [editedRawData, setEditedRawData] = useState({});
  const [reviewComment, setReviewComment] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetchData();
  }, [scopeFilter, statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Build query string
      let url = `${API_BASE}/records/?organization_name=${encodeURIComponent(organization)}`;
      if (scopeFilter !== "ALL") url += `&scope=${scopeFilter}`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const recordsRes = await axios.get(url);
      setRecords(recordsRes.data);

      const statsRes = await axios.get(
        `${API_BASE}/stats/?organization_name=${encodeURIComponent(organization)}`
      );
      setStats(statsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("source_type", sourceType);
    formData.append("organization_name", organization);

    try {
      await axios.post(`${API_BASE}/upload/`, formData);
      setFile(null);
      setShowUpload(false);
      fetchData();
    } catch (error) {
      console.error("Upload failed:", error);
      alert("Failed to process the CSV dataset. Please check column format.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedIds.length === 0) return;
    const comment = prompt(`Enter review comment for these ${selectedIds.length} records:`) || "Bulk action review";
    try {
      await axios.post(`${API_BASE}/bulk-update/`, {
        ids: selectedIds,
        action,
        comment
      });
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      console.error("Bulk update failed:", error);
    }
  };

  const handleUpdateStatus = async (id, status, comment = "Status updated") => {
    try {
      await axios.patch(`${API_BASE}/update-record/${id}/`, {
        status,
        review_comment: comment
      });
      fetchData();
      if (activeRecord && activeRecord.id === id) {
        // Refresh active record details
        const updated = records.find(r => r.id === id) || activeRecord;
        setActiveRecord({ ...updated, status, review_comment: comment });
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDeleteRecord = async (id) => {
    if (!confirm("Are you sure you want to delete this record? This action is permanent.")) return;
    try {
      await axios.delete(`${API_BASE}/delete-record/${id}/`);
      setSelectedIds(selectedIds.filter(item => item !== id));
      if (activeRecord && activeRecord.id === id) setActiveRecord(null);
      fetchData();
    } catch (error) {
      console.error("Failed to delete record:", error);
    }
  };

  const handleSelectRecord = (record) => {
    setActiveRecord(record);
    setEditedRawData({ ...record.raw_data });
    setReviewComment(record.review_comment || "");
  };

  const handleRawFieldChange = (key, val) => {
    setEditedRawData({ ...editedRawData, [key]: val });
  };

  const handleSaveChanges = async () => {
    if (!activeRecord) return;
    setSavingEdit(true);
    try {
      const response = await axios.patch(`${API_BASE}/update-record/${activeRecord.id}/`, {
        raw_data: editedRawData,
        review_comment: reviewComment || "Manual corrections applied"
      });
      alert("Corrections saved and carbon emissions recalculated.");
      setActiveRecord(response.data.record);
      fetchData();
    } catch (error) {
      console.error("Failed to save changes:", error);
      alert("Failed to save corrections. Verify the format of quantities and dates.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("organization");
    navigate("/");
  };

  // Stacked Bar calculations
  const s1 = stats.scope_breakdown.SCOPE_1 || 0;
  const s2 = stats.scope_breakdown.SCOPE_2 || 0;
  const s3 = stats.scope_breakdown.SCOPE_3 || 0;
  const scopeTotal = s1 + s2 + s3;
  const p1 = scopeTotal > 0 ? (s1 / scopeTotal) * 100 : 0;
  const p2 = scopeTotal > 0 ? (s2 / scopeTotal) * 100 : 0;
  const p3 = scopeTotal > 0 ? (s3 / scopeTotal) * 100 : 0;

  // Monthly SVG bar chart calculations
  const maxMonthlyVal = stats.monthly_breakdown.length > 0 
    ? Math.max(...stats.monthly_breakdown.map(d => d.total)) 
    : 1;

  return (
    <div className="min-h-screen bg-[#090d16] text-gray-100 overflow-x-hidden relative font-sans">
      {/* Background Mesh Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#131e35,_#090d16)] pointer-events-none"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Navigation Bar */}
        <div className="flex justify-between items-center border-b border-white/10 pb-6 flex-wrap gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              System Dashboard
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              {organization} <span className="text-cyan-400 font-medium text-lg">| ESG platform</span>
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-white/5 border border-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
            <div className="text-right">
              <h4 className="text-sm font-bold text-white">{username}</h4>
              <p className="text-xs text-gray-400">{email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* KPI Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl"></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Approved Footprint</span>
            <h2 className="text-3xl font-extrabold text-white mt-2">
              {stats.total_co2e_kg.toLocaleString()} <span className="text-xs text-cyan-400 font-normal">kg CO2e</span>
            </h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Pending Analyst Review</span>
            <h2 className="text-3xl font-extrabold text-yellow-400 mt-2">
              {stats.status_counts.PENDING || 0} <span className="text-xs font-normal text-gray-400">rows</span>
            </h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Critical Anomalies</span>
            <h2 className="text-3xl font-extrabold text-orange-400 mt-2">
              {stats.status_counts.SUSPICIOUS || 0} <span className="text-xs font-normal text-gray-400">warnings</span>
            </h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-5 shadow-lg">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Validation Failures</span>
            <h2 className="text-3xl font-extrabold text-rose-500 mt-2">
              {stats.status_counts.FAILED || 0} <span className="text-xs font-normal text-gray-400">errors</span>
            </h2>
          </div>
        </div>

        {/* Charts & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Scope Breakdown stacked bar */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Scope Classification</h3>
              <p className="text-gray-400 text-xs mt-1">Direct and indirect carbon distribution breakdown.</p>
            </div>
            
            <div className="my-6 space-y-4">
              <div className="h-6 w-full bg-white/5 rounded-full overflow-hidden flex">
                {s1 > 0 && <div style={{ width: `${p1}%` }} className="bg-coral bg-rose-500 h-full" title={`Scope 1: ${s1.toLocaleString()} kg`}></div>}
                {s2 > 0 && <div style={{ width: `${p2}%` }} className="bg-cyan-500 h-full" title={`Scope 2: ${s2.toLocaleString()} kg`}></div>}
                {s3 > 0 && <div style={{ width: `${p3}%` }} className="bg-purple-500 h-full" title={`Scope 3: ${s3.toLocaleString()} kg`}></div>}
                {scopeTotal === 0 && <div className="w-full bg-zinc-700 h-full"></div>}
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="border-l-2 border-rose-500 pl-2">
                  <span className="text-gray-400 block font-medium">Scope 1</span>
                  <span className="text-white font-bold">{round(p1, 1)}%</span>
                </div>
                <div className="border-l-2 border-cyan-500 pl-2">
                  <span className="text-gray-400 block font-medium">Scope 2</span>
                  <span className="text-white font-bold">{round(p2, 1)}%</span>
                </div>
                <div className="border-l-2 border-purple-500 pl-2">
                  <span className="text-gray-400 block font-medium">Scope 3</span>
                  <span className="text-white font-bold">{round(p3, 1)}%</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 text-center">
              Emissions are calculated from verified and approved records only.
            </div>
          </div>

          {/* Monthly Trend SVG Bar Chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Monthly Emissions</h3>
              <p className="text-gray-400 text-xs mt-1">Calendarized allocation of greenhouse gas emissions.</p>
            </div>

            <div className="my-3 flex justify-center items-center">
              {stats.monthly_breakdown.length === 0 ? (
                <div className="h-[150px] flex items-center text-gray-500 text-xs">No trend data available.</div>
              ) : (
                <svg width="280" height="150" className="overflow-visible">
                  {/* Grid Lines */}
                  <line x1="30" y1="10" x2="280" y2="10" stroke="rgba(255,255,255,0.05)" />
                  <line x1="30" y1="60" x2="280" y2="60" stroke="rgba(255,255,255,0.05)" />
                  <line x1="30" y1="110" x2="280" y2="110" stroke="rgba(255,255,255,0.05)" />
                  <line x1="30" y1="130" x2="280" y2="130" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />

                  {/* Axis Label */}
                  <text x="5" y="15" fill="rgba(255,255,255,0.4)" fontSize="8">Max</text>
                  <text x="5" y="130" fill="rgba(255,255,255,0.4)" fontSize="8">0</text>

                  {/* Bars */}
                  {stats.monthly_breakdown.map((item, idx) => {
                    const barWidth = 24;
                    const spacing = 16;
                    const x = 40 + idx * (barWidth + spacing);
                    const barHeight = (item.total / maxMonthlyVal) * 100;
                    const y = 130 - barHeight;

                    return (
                      <g key={item.month}>
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={barHeight}
                          fill="#06b6d4"
                          rx="3"
                          opacity="0.8"
                          className="hover:opacity-100 transition-opacity duration-200"
                        />
                        <text
                          x={x + barWidth / 2}
                          y="144"
                          fill="rgba(255,255,255,0.6)"
                          fontSize="9"
                          textAnchor="middle"
                        >
                          {item.month.split("-")[1]}
                        </text>
                        <title>{`${item.month}: ${item.total.toLocaleString()} kg`}</title>
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
            
            <div className="text-xs text-gray-500 text-center">
              Allocated proportionally by day for multi-month billing cycles.
            </div>
          </div>

          {/* Location Breakdowns */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Top Locations</h3>
              <p className="text-gray-400 text-xs mt-1">Primary sites sorted by aggregated emission totals.</p>
            </div>

            <div className="my-4 space-y-3">
              {stats.location_breakdown.length === 0 ? (
                <div className="text-gray-500 text-xs py-4 text-center">No location metrics available.</div>
              ) : (
                stats.location_breakdown.map((item) => {
                  const maxLocVal = Math.max(...stats.location_breakdown.map(l => l.total)) || 1;
                  const ratio = (item.total / maxLocVal) * 100;

                  return (
                    <div key={item.location} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="truncate max-w-[180px] text-gray-300">{item.location}</span>
                        <span className="text-white">{item.total.toLocaleString()} kg</span>
                      </div>
                      <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                        <div style={{ width: `${ratio}%` }} className="bg-cyan-500/80 h-full"></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="text-xs text-gray-500 text-center">
              Maps plants, offices, and airport destinations.
            </div>
          </div>
        </div>

        {/* Filters and Search toolbar */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row gap-4 items-center justify-between">
          <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <input
                type="text"
                placeholder="Search location, source, file name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-white pl-10 pr-4 py-2 rounded-xl focus:outline-none focus:border-cyan-500 text-sm"
              />
              <FiSearch className="absolute left-3 top-2.5 text-gray-500" size={18} />
            </div>
            <button
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold px-4 py-2 rounded-xl text-sm transition"
            >
              Search
            </button>
          </form>

          <div className="flex gap-3 flex-wrap w-full md:w-auto items-center justify-end">
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white px-3 py-2 rounded-xl text-sm focus:outline-none"
            >
              <option value="ALL">All Scopes</option>
              <option value="SCOPE_1">Scope 1</option>
              <option value="SCOPE_2">Scope 2</option>
              <option value="SCOPE_3">Scope 3</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white px-3 py-2 rounded-xl text-sm focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="SUSPICIOUS">Suspicious</option>
              <option value="FAILED">Failed</option>
            </select>

            <button
              onClick={() => setShowUpload(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold px-4 py-2 rounded-xl text-sm transition flex items-center gap-2"
            >
              <FiUploadCloud size={16} /> Ingest Dataset
            </button>
          </div>
        </div>

        {/* Bulk action toolbar */}
        {selectedIds.length > 0 && (
          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 flex justify-between items-center animate-fade-in">
            <span className="text-cyan-300 font-semibold text-sm">
              Selected {selectedIds.length} items for bulk review
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction("APPROVE")}
                className="bg-green-500 hover:bg-green-400 text-black px-3.5 py-1.5 rounded-lg text-xs font-bold transition"
              >
                Bulk Approve
              </button>
              <button
                onClick={() => handleBulkAction("REJECT")}
                className="bg-rose-500 hover:bg-rose-400 text-black px-3.5 py-1.5 rounded-lg text-xs font-bold transition"
              >
                Bulk Reject
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="bg-transparent hover:bg-white/5 border border-white/10 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold transition"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Ingested Records Table */}
        <RecordsTable
          records={records}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          onSelectRecord={handleSelectRecord}
          updateStatus={handleUpdateStatus}
          deleteRecord={handleDeleteRecord}
        />
      </div>

      {/* Dataset Ingestion Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="relative p-2 bg-transparent w-full max-w-md">
            <button
              onClick={() => setShowUpload(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white z-20"
            >
              <FiX size={24} />
            </button>
            <UploadCard
              sourceType={sourceType}
              setSourceType={setSourceType}
              setFile={setFile}
              handleUpload={handleUpload}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Side Drawer Review & Edit Panel */}
      {activeRecord && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-4xl bg-[#0c1220] border-l border-white/10 h-full p-6 overflow-y-auto relative space-y-6 shadow-2xl flex flex-col justify-between">
            
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex justify-between items-start border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-zinc-800 text-zinc-300 border border-zinc-700 px-3 py-1 rounded-full text-xs font-semibold">
                      {activeRecord.source_type}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                      activeRecord.status === "PENDING"
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        : activeRecord.status === "APPROVED"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {activeRecord.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white mt-2">
                    Review Ingestion Record #{activeRecord.id}
                  </h2>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    Source File: {activeRecord.source_file_name || "Manual Ingestion"} (Row {activeRecord.row_index || "N/A"})
                  </p>
                </div>

                <button
                  onClick={() => setActiveRecord(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <FiX size={24} />
                </button>
              </div>

              {/* Side-by-Side Editor Panels */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Panel - Raw Ingested Data */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-bold text-cyan-400 border-b border-white/5 pb-2">
                    Raw Ingested Data
                  </h3>
                  <div className="space-y-3">
                    {Object.keys(activeRecord.raw_data || {}).map((key) => {
                      const val = editedRawData[key];
                      return (
                        <div key={key} className="space-y-1">
                          <label className="text-xs font-mono text-gray-400 block">{key}</label>
                          <input
                            type="text"
                            value={val === null || val === undefined ? "" : val}
                            onChange={(e) => handleRawFieldChange(key, e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={handleSaveChanges}
                    disabled={savingEdit}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-2 rounded-lg text-xs transition shadow-md disabled:opacity-50"
                  >
                    {savingEdit ? "Recalculating..." : "Recalculate & Save Corrections"}
                  </button>
                </div>

                {/* Right Panel - Normalized Calculations */}
                <div className="space-y-6">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold text-cyan-400 border-b border-white/5 pb-2">
                      Calculated Normalization
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-gray-400 block">Scope Classification</span>
                        <span className="text-white font-semibold">{activeRecord.scope || "Unclassified"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Physical Location</span>
                        <span className="text-white font-semibold">{activeRecord.location || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Raw Quantity</span>
                        <span className="text-white font-semibold">
                          {activeRecord.raw_quantity !== null ? activeRecord.raw_quantity.toLocaleString() : "N/A"} {activeRecord.raw_unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Normalized Quantity</span>
                        <span className="text-white font-semibold text-cyan-300">
                          {activeRecord.normalized_quantity !== null ? activeRecord.normalized_quantity.toLocaleString() : "N/A"} {activeRecord.normalized_unit}
                        </span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-white/5">
                        <span className="text-gray-400 block">Calculated Carbon Footprint</span>
                        <span className="text-lg font-extrabold text-white">
                          {activeRecord.co2e_kg !== null ? `${activeRecord.co2e_kg.toLocaleString()} kg CO2e` : "Pending calculation"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Billing Period allocations for Utility Scope 2 */}
                  {activeRecord.normalized_data && activeRecord.normalized_data.allocations && activeRecord.normalized_data.allocations.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                      <h3 className="text-xs font-bold text-cyan-400">
                        Proportional Monthly Allocation
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-gray-400">
                              <th className="py-1">Calendar Month</th>
                              <th className="py-1">Days</th>
                              <th className="py-1 text-right">Consumption</th>
                              <th className="py-1 text-right">Emissions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeRecord.normalized_data.allocations.map((alloc) => (
                              <tr key={alloc.month} className="border-b border-white/5 text-gray-300">
                                <td className="py-1">{alloc.month}</td>
                                <td className="py-1">{alloc.days} days</td>
                                <td className="py-1 text-right">{alloc.allocated_value.toLocaleString()} kWh</td>
                                <td className="py-1 text-right text-cyan-300">{alloc.co2e_kg.toLocaleString()} kg</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Timeline Audit Logs */}
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 max-h-[220px] overflow-y-auto">
                    <h3 className="text-xs font-bold text-cyan-400 border-b border-white/5 pb-1 flex items-center gap-1.5">
                      <FiClock size={12} /> Ingestion & Modification Audit Trail
                    </h3>
                    <div className="space-y-3 relative pl-3 border-l border-white/10 text-xs">
                      {activeRecord.audit_logs && activeRecord.audit_logs.map((log) => (
                        <div key={log.id} className="space-y-0.5 relative">
                          <div className="absolute -left-[16.5px] top-1.5 w-2 h-2 rounded-full bg-cyan-500"></div>
                          <div className="flex justify-between text-gray-400 font-mono text-[10px]">
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                            <span>{log.user_username || "System Ingestion"}</span>
                          </div>
                          <div className="font-bold text-white uppercase text-[10px]">
                            {log.action}
                          </div>
                          {log.changes && (
                            <div className="bg-black/30 p-1.5 rounded font-mono text-[9px] text-gray-400">
                              {Object.keys(log.changes).map(field => (
                                <div key={field}>
                                  {field}: {JSON.stringify(log.changes[field][0])} &rarr; {JSON.stringify(log.changes[field][1])}
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="text-gray-300 italic font-medium">{log.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* In-drawer review decisions */}
            <div className="border-t border-white/10 pt-4 space-y-3">
              <label className="text-xs font-semibold text-gray-400 block">Review Comment / Auditor Notes</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Append reason for approval or rejection..."
                rows={2}
                className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-cyan-500"
              />

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => handleUpdateStatus(activeRecord.id, "APPROVED", reviewComment || "Auditor approved")}
                  className="bg-green-500 hover:bg-green-400 text-black font-bold px-4 py-2 rounded-xl text-xs transition shadow-md"
                >
                  Approve Record
                </button>
                <button
                  onClick={() => handleUpdateStatus(activeRecord.id, "REJECTED", reviewComment || "Auditor rejected")}
                  className="bg-rose-500 hover:bg-rose-400 text-black font-bold px-4 py-2 rounded-xl text-xs transition shadow-md"
                >
                  Reject Record
                </button>
                <button
                  onClick={() => handleDeleteRecord(activeRecord.id)}
                  className="bg-zinc-850 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 px-4 py-2 rounded-xl text-xs"
                >
                  Delete
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// Inline helper for round calculations
function round(value, decimals) {
  return Number(Math.round(value + "e" + decimals) + "e-" + decimals) || 0;
}

export default Dashboard;