import { useEffect, useRef } from "react"

export default function DashboardWidget({ data }) {
  const chartRef = useRef(null)

  useEffect(() => {
    if (!data.chart || !chartRef.current) return

    // Dynamically import Chart.js
    import("chart.js/auto").then(({ default: Chart }) => {
      // Destroy previous instance if it exists
      const existing = Chart.getChart(chartRef.current)
      if (existing) existing.destroy()

      new Chart(chartRef.current, {
        type: data.chart.type || "bar",
        data: {
          labels: data.chart.labels,
          datasets: data.chart.datasets.map((ds, i) => ({
            ...ds,
            backgroundColor: [
              "rgba(83, 74, 183, 0.7)",
              "rgba(29, 158, 117, 0.7)",
              "rgba(216, 90, 48, 0.7)",
              "rgba(212, 83, 126, 0.7)",
            ][i % 4],
            borderColor: [
              "#534AB7",
              "#0F6E56",
              "#993C1D",
              "#993556",
            ][i % 4],
            borderWidth: 1.5,
            borderRadius: 4,
          })),
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: "bottom" },
          },
          scales: {
            y: { grid: { color: "rgba(0,0,0,0.05)" } },
            x: { grid: { display: false } },
          },
        },
      })
    })
  }, [data])

  const trendIcon = trend => {
    if (trend === "up") return "↑"
    if (trend === "down") return "↓"
    return "→"
  }

  const trendClass = trend => {
    if (trend === "up") return "trend-up"
    if (trend === "down") return "trend-down"
    return "trend-neutral"
  }

  return (
    <div className="dashboard-widget">
      {data.title && <h3 className="widget-title">{data.title}</h3>}

      {/* Metric cards */}
      {data.cards && data.cards.length > 0 && (
        <div className="metric-cards">
          {data.cards.map((card, i) => (
            <div key={i} className="metric-card">
              <div className="metric-label">{card.title}</div>
              <div className="metric-value">{card.value}</div>
              {card.change && (
                <div className={`metric-change ${trendClass(card.trend)}`}>
                  {trendIcon(card.trend)} {card.change}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {data.chart && (
        <div className="chart-container">
          <canvas ref={chartRef} />
        </div>
      )}
    </div>
  )
}
