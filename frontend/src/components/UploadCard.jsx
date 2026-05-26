import { FiUploadCloud } from "react-icons/fi";

function UploadCard({
  sourceType,
  setSourceType,
  setFile,
  handleUpload,
  loading
}) {

  return (

    <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-10 w-full max-w-md mx-auto relative overflow-hidden">

      {/* Glow Effect */}

      <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-400/20 rounded-full blur-3xl"></div>

      <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl"></div>


      {/* Content */}

      <div className="relative z-10">

        <div className="text-center mb-8">

          <div className="flex justify-center mb-4">

            <div className="bg-cyan-500/20 p-4 rounded-2xl border border-cyan-400/20 shadow-lg">

              <FiUploadCloud
                className="text-cyan-300"
                size={40}
              />

            </div>

          </div>

          <h1 className="text-5xl font-extrabold text-white tracking-wide">

            ESG Dashboard

          </h1>

          <p className="text-gray-300 mt-3 text-sm leading-relaxed">

            Upload, validate, and review
            enterprise sustainability datasets
            in real time.

          </p>

        </div>


        <div className="space-y-5">

          <select
            value={sourceType}
            onChange={(e) =>
              setSourceType(e.target.value)
            }
            className="bg-white/10 border border-white/20 text-white p-4 w-full rounded-2xl focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all duration-300"
          >

            <option
              value="SAP"
              className="text-black"
            >
              SAP
            </option>

            <option
              value="UTILITY"
              className="text-black"
            >
              Utility
            </option>

            <option
              value="TRAVEL"
              className="text-black"
            >
              Travel
            </option>

          </select>


          <input
            type="file"
            accept=".csv"
            className="bg-white/10 border border-white/20 text-white file:bg-cyan-500 file:border-0 file:text-black file:px-4 file:py-2 file:rounded-xl file:font-semibold file:mr-4 p-3 w-full rounded-2xl transition-all duration-300"
            onChange={(e) =>
              setFile(e.target.files[0])
            }
          />


          <button
            onClick={handleUpload}
            disabled={loading}
            className="bg-cyan-500 hover:bg-cyan-400 hover:scale-105 transition-all duration-300 text-black font-bold w-full py-4 rounded-2xl shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
          >

            <FiUploadCloud size={22} />

            {
              loading
                ? "Uploading..."
                : "Upload CSV"
            }

          </button>

        </div>

      </div>

    </div>
  );
}

export default UploadCard;