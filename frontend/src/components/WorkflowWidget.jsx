import { useEffect, useRef } from "react"

/**
 * WorkflowWidget — renders nodes + edges as an SVG flowchart.
 * Uses vanilla SVG so we don't need ReactFlow installed at runtime.
 * For production, swap the SVG renderer with ReactFlow.
 */

const NODE_COLORS = {
  start:    { fill: "#E1F5EE", stroke: "#0F6E56", text: "#085041" },
  step:     { fill: "#E6F1FB", stroke: "#185FA5", text: "#0C447C" },
  decision: { fill: "#FAEEDA", stroke: "#854F0B", text: "#633806" },
  end:      { fill: "#FCEBEB", stroke: "#A32D2D", text: "#791F1F" },
}

const NODE_W = 160
const NODE_H = 48
const H_GAP = 40
const V_GAP = 60

export default function WorkflowWidget({ data }) {
  if (!data || !data.nodes) return null

  const { nodes, edges, title } = data

  // Simple top-down layout: one column, evenly spaced
  const layout = nodes.map((node, i) => ({
    ...node,
    x: 200,
    y: 40 + i * (NODE_H + V_GAP),
  }))

  const totalHeight = 40 + nodes.length * (NODE_H + V_GAP) + 40
  const svgWidth = 560

  // Build a lookup for node positions
  const posMap = {}
  layout.forEach(n => { posMap[n.id] = n })

  return (
    <div className="workflow-widget">
      {title && <h3 className="widget-title">{title}</h3>}

      <div className="workflow-scroll">
        <svg
          viewBox={`0 0 ${svgWidth} ${totalHeight}`}
          width="100%"
          style={{ maxWidth: svgWidth }}
        >
          <defs>
            <marker
              id="wf-arrow"
              viewBox="0 0 10 10"
              refX="8" refY="5"
              markerWidth="6" markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M2 1L8 5L2 9"
                fill="none"
                stroke="#888780"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </marker>
          </defs>

          {/* Edges */}
          {edges && edges.map((edge, i) => {
            const from = posMap[edge.from]
            const to   = posMap[edge.to]
            if (!from || !to) return null

            const x1 = from.x + NODE_W / 2
            const y1 = from.y + NODE_H
            const x2 = to.x + NODE_W / 2
            const y2 = to.y

            return (
              <g key={`edge-${i}`}>
                <line
                  x1={x1} y1={y1}
                  x2={x2} y2={y2}
                  stroke="#B4B2A9"
                  strokeWidth="1.5"
                  markerEnd="url(#wf-arrow)"
                />
                {edge.label && (
                  <text
                    x={(x1 + x2) / 2 + 8}
                    y={(y1 + y2) / 2}
                    fontSize="11"
                    fill="#888780"
                    dominantBaseline="middle"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            )
          })}

          {/* Nodes */}
          {layout.map(node => {
            const colors = NODE_COLORS[node.type] || NODE_COLORS.step
            const isDecision = node.type === "decision"

            if (isDecision) {
              // Diamond shape
              const cx = node.x + NODE_W / 2
              const cy = node.y + NODE_H / 2
              const hw = NODE_W / 2
              const hh = NODE_H / 2
              return (
                <g key={node.id}>
                  <polygon
                    points={`${cx},${cy-hh} ${cx+hw},${cy} ${cx},${cy+hh} ${cx-hw},${cy}`}
                    fill={colors.fill}
                    stroke={colors.stroke}
                    strokeWidth="1"
                  />
                  <text
                    x={cx} y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="12"
                    fontWeight="500"
                    fill={colors.text}
                  >
                    {node.label}
                  </text>
                </g>
              )
            }

            // Rounded rectangle
            return (
              <g key={node.id}>
                <rect
                  x={node.x} y={node.y}
                  width={NODE_W} height={NODE_H}
                  rx="8"
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth="1"
                />
                <text
                  x={node.x + NODE_W / 2}
                  y={node.y + NODE_H / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="13"
                  fontWeight="500"
                  fill={colors.text}
                >
                  {node.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <p className="workflow-hint">
        💡 Install <code>reactflow</code> for interactive, draggable diagrams
      </p>
    </div>
  )
}
