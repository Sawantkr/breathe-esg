import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import axios from "axios";

import UploadCard from "../components/UploadCard";

import RecordsTable from "../components/RecordsTable";

function Dashboard() {

  const navigate = useNavigate();

  const username =
    localStorage.getItem("username");

  const email =
    localStorage.getItem("email");

  const token =
    localStorage.getItem("token");


  const [file, setFile] = useState(null);

  const [sourceType, setSourceType] =
    useState("SAP");

  const [records, setRecords] = useState([]);

  const [loading, setLoading] =
    useState(false);


  useEffect(() => {

    if (!token) {

      navigate("/");
    }

    fetchRecords();

  }, []);


  const fetchRecords = async () => {

    try {

      const response = await axios.get(
        "https://breathe-esg-t84p.onrender.com/api/records/"
      );

      setRecords(response.data);

    } catch (error) {

      console.log(error);
    }
  };


  const handleUpload = async () => {

    if (!file) {

      return;
    }

    setLoading(true);

    const formData = new FormData();

    formData.append("file", file);

    formData.append(
      "source_type",
      sourceType
    );

    try {

      await axios.post(
        "https://breathe-esg-t84p.onrender.com/api/upload/",
        formData
      );

      setTimeout(() => {

        fetchRecords();

      }, 200);

      setFile(null);

    } catch (error) {

      console.log(error);
    }

    finally {

      setLoading(false);
    }
  };


  const updateStatus = async (
    id,
    status
  ) => {

    try {

      await axios.patch(
        `https://breathe-esg-t84p.onrender.com/api/update-status/${id}/`,
        {
          status
        }
      );

      const updatedRecords =
        records.map((record) => {

          if (record.id === id) {

            return {
              ...record,
              status: status
            };
          }

          return record;
        });

      setRecords(updatedRecords);

    } catch (error) {

      console.log(error);
    }
  };


  const deleteRecord = async (id) => {

    const confirmDelete = window.confirm(
      "Delete this record?"
    );

    if (!confirmDelete) {

      return;
    }

    try {

      await axios.delete(
        `https://breathe-esg-t84p.onrender.com/api/delete-record/${id}/`
      );

      const updatedRecords =
        records.filter(
          (record) => record.id !== id
        );

      setRecords(updatedRecords);

    } catch (error) {

      console.log(error);
    }
  };


  const handleLogout = () => {

    localStorage.removeItem("token");

    localStorage.removeItem("username");

    localStorage.removeItem("email");

    navigate("/");
  };


  return (

    <div className="min-h-screen bg-[#020617] overflow-hidden relative">

      {/* Background */}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#1e293b,_#020617)]"></div>


      {/* Glow */}

      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>

      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>


      {/* Main */}

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-14">


        {/* Top Bar */}

        <div className="flex justify-between items-center flex-wrap gap-5">

          {/* Left Badge */}

          <div className="inline-flex items-center gap-3 bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 px-6 py-3 rounded-full text-sm font-semibold shadow-lg backdrop-blur-xl">

            🌱 AI-Powered ESG Intelligence Platform

          </div>


          {/* Profile Card */}

          <div className="flex items-center gap-4 bg-white/10 border border-white/10 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-xl hover:scale-105 transition-all duration-300">

            {/* Profile Image */}

            <div className="relative">

              <img
                src="https://i.pravatar.cc/150?img=12"
                alt="profile"
                className="w-14 h-14 rounded-full border-2 border-cyan-400 object-cover"
              />

              <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 border-2 border-black rounded-full"></div>

            </div>


            {/* User Info */}

            <div>

              <h3 className="text-white font-bold text-lg">

                {username}

              </h3>

              <p className="text-gray-400 text-sm">

                {email}

              </p>

            </div>


            {/* Logout */}

            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-400 px-4 py-2 rounded-xl text-white font-semibold transition-all duration-300"
            >

              Logout

            </button>

          </div>

        </div>


        {/* Hero */}

        <div className="text-center space-y-6">

          <div className="overflow-hidden whitespace-nowrap py-5">

            <div className="animate-[marquee_10s_linear_infinite] inline-flex gap-16 text-emerald-300 text-lg font-semibold">

              <span>

                🌱 ESG Intelligence •
                📊 Sustainability Reporting •
                ♻️ Carbon Analytics •
                ⚡ Enterprise ESG Automation •
                🔍 Anomaly Detection •
                🚀 Analyst Review Workflow •

              </span>

              <span>

                🌱 ESG Intelligence •
                📊 Sustainability Reporting •
                ♻️ Carbon Analytics •
                ⚡ Enterprise ESG Automation •
                🔍 Anomaly Detection •
                🚀 Analyst Review Workflow •

              </span>

            </div>

          </div>


          <h1 className="text-7xl md:text-8xl font-black text-white tracking-tight leading-none transition-all duration-300 hover:scale-110 hover:text-cyan-400 cursor-pointer">

            ESG DATA HUB

          </h1>


          <p className="text-gray-400 text-xl max-w-3xl mx-auto leading-relaxed">

            Sustainable Data Operations

          </p>

        </div>


        {/* Upload */}

        <UploadCard
          sourceType={sourceType}
          setSourceType={setSourceType}
          setFile={setFile}
          handleUpload={handleUpload}
          loading={loading}
        />


        {/* Analytics */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          <div className="backdrop-blur-xl bg-white/10 border border-white/10 rounded-3xl p-8">

            <p className="text-gray-400 text-sm uppercase">

              ESG Records

            </p>

            <h2 className="text-6xl font-black text-white mt-5">

              {records.length}

            </h2>

          </div>


          <div className="backdrop-blur-xl bg-green-500/10 border border-green-400/10 rounded-3xl p-8">

            <p className="text-green-300 text-sm uppercase">

              Approved

            </p>

            <h2 className="text-6xl font-black text-green-400 mt-5">

              {
                records.filter(
                  (r) => r.status === "APPROVED"
                ).length
              }

            </h2>

          </div>


          <div className="backdrop-blur-xl bg-red-500/10 border border-red-400/10 rounded-3xl p-8">

            <p className="text-red-300 text-sm uppercase">

              Validation Errors

            </p>

            <h2 className="text-6xl font-black text-red-400 mt-5">

              {
                records.filter(
                  (r) => r.status === "FAILED"
                ).length
              }

            </h2>

          </div>


          <div className="backdrop-blur-xl bg-orange-500/10 border border-orange-400/10 rounded-3xl p-8">

            <p className="text-orange-300 text-sm uppercase">

              Anomalies

            </p>

            <h2 className="text-6xl font-black text-orange-400 mt-5">

              {
                records.filter(
                  (r) => r.status === "SUSPICIOUS"
                ).length
              }

            </h2>

          </div>

        </div>


        {/* Table */}

        <RecordsTable
          records={records}
          updateStatus={updateStatus}
          deleteRecord={deleteRecord}
        />


        {/* Footer */}

        <div className="text-center pt-10">

          <div className="inline-flex items-center gap-2 text-gray-500 text-sm backdrop-blur-xl bg-white/5 border border-white/10 px-5 py-3 rounded-full">

            Made By Sawant

          </div>

        </div>

      </div>

    </div>
  );
}

export default Dashboard;