function RecordsTable({
  records,
  updateStatus,
  deleteRecord
}) {

  return (

    <div className="mt-12 backdrop-blur-2xl bg-white/10 border border-white/10 rounded-[32px] shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-8 overflow-x-auto max-h-[650px] overflow-y-auto relative">

      {/* Glow */}

      <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 blur-3xl rounded-full"></div>

      <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 blur-3xl rounded-full"></div>


      <div className="relative z-10">

        {/* Header */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">

          <div>

            <h2 className="text-5xl font-extrabold text-white tracking-tight">

              Uploaded Records

            </h2>

            <p className="text-gray-400 mt-3 text-lg">

              ESG ingestion validation and analyst review workflow

            </p>

          </div>


          <div className="flex gap-4 flex-wrap">

            <div className="bg-cyan-500/15 border border-cyan-400/20 text-cyan-300 px-6 py-4 rounded-2xl shadow-lg">

              <p className="text-sm text-gray-300">
                Total
              </p>

              <h2 className="text-3xl font-bold">
                {records.length}
              </h2>

            </div>

          </div>

        </div>


        {/* Empty State */}

        {
          records.length === 0 && (

            <div className="text-center py-24">

              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/10 border border-white/10 mb-6">

                <span className="text-5xl">
                  📂
                </span>

              </div>

              <h2 className="text-4xl font-bold text-white mb-4">

                No Records Yet

              </h2>

              <p className="text-gray-400 text-lg">

                Upload CSV files to start ESG validation

              </p>

            </div>
          )
        }


        {/* Table */}

        {
          records.length > 0 && (

            <table className="w-full border-separate border-spacing-y-5">

              <thead>

                <tr className="bg-white/10 text-cyan-300 backdrop-blur-xl">

                  <th className="p-5 text-left rounded-l-2xl">
                    ID
                  </th>

                  <th className="p-5 text-left">
                    Source
                  </th>

                  <th className="p-5 text-left">
                    Status
                  </th>

                  <th className="p-5 text-left">
                    Review Comment
                  </th>

                  <th className="p-5 text-left">
                    Uploaded
                  </th>

                  <th className="p-5 text-left rounded-r-2xl">
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {records.map((record) => (

                  <tr
                    key={record.id}
                    className="bg-white/[0.06] border border-white/10 hover:bg-white/[0.09] transition-all duration-300 rounded-3xl"
                  >

                    {/* ID */}

                    <td className="p-5 font-bold text-white text-lg">

                      #{record.id}

                    </td>


                    {/* Source */}

                    <td className="p-5">

                      <span className="bg-white/10 border border-white/10 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">

                        {record.source_type}

                      </span>

                    </td>


                    {/* Status */}

                    <td className="p-5">

                      <span
                        className={`px-5 py-2 rounded-full text-sm font-bold shadow-lg border

                          ${
                            record.status === "PENDING"
                              ? "bg-yellow-500/20 text-yellow-300 border-yellow-400/20"

                            : record.status === "APPROVED"
                              ? "bg-green-500/20 text-green-300 border-green-400/20"

                            : record.status === "SUSPICIOUS"
                              ? "bg-orange-500/20 text-orange-300 border-orange-400/20"

                            : record.status === "REJECTED"
                              ? "bg-rose-500/20 text-rose-300 border-rose-400/20"

                            : "bg-red-500/20 text-red-300 border-red-400/20"
                          }
                        `}
                      >

                        {record.status}

                      </span>

                    </td>


                    {/* Review */}

                    <td className="p-5 text-gray-300 max-w-[350px] leading-relaxed">

                      {record.review_comment}

                    </td>


                    {/* Uploaded */}

                    <td className="p-5 text-gray-400 text-sm">

                      {
                        new Date(
                          record.uploaded_at
                        ).toLocaleString()
                      }

                    </td>


                    {/* Actions */}

                    <td className="p-5">

                      <div className="flex flex-wrap gap-3">

                        <button
                          onClick={() =>
                            updateStatus(
                              record.id,
                              "APPROVED"
                            )
                          }
                          className="bg-emerald-500 hover:bg-emerald-400 hover:scale-105 transition-all duration-200 text-black font-bold px-5 py-2 rounded-2xl shadow-xl"
                        >

                          Approve

                        </button>


                        <button
                          onClick={() =>
                            updateStatus(
                              record.id,
                              "REJECTED"
                            )
                          }
                          className="bg-rose-500 hover:bg-rose-400 hover:scale-105 transition-all duration-200 text-black font-bold px-5 py-2 rounded-2xl shadow-xl"
                        >

                          Reject

                        </button>


                        <button
                          onClick={() =>
                            deleteRecord(record.id)
                          }
                          className="bg-white/10 hover:bg-white/20 hover:scale-105 transition-all duration-200 text-white px-5 py-2 rounded-2xl border border-white/20 shadow-lg"
                        >

                          Delete

                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>
          )
        }

      </div>

    </div>
  );
}

export default RecordsTable;