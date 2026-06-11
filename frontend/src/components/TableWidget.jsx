// TableWidget.jsx
export function TableWidget({ data }) {
  if (!data || !data.columns) return null
  return (
    <div className="table-widget">
      {data.title && <h3 className="widget-title">{data.title}</h3>}
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {data.columns.map((col, i) => <th key={i}>{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => <td key={j}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TableWidget
