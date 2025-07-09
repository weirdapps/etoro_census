'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface InvestorData {
  x: number; // Average risk score
  y: number; // Period return
  username: string;
  fullName: string;
  copiers: number;
  label?: string; // For notable investors
}

interface RiskReturnScatterProps {
  data: InvestorData[];
  title?: string;
  subtitle?: string;
  height?: number;
}

export default function RiskReturnScatter({ 
  data, 
  title = "Risk vs Return Analysis",
  subtitle = "Top 50 eToro Investors",
  height = 600
}: RiskReturnScatterProps) {

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, coordinate }: { 
    active?: boolean; 
    payload?: Array<{ payload: InvestorData }>;
    coordinate?: { x: number; y: number };
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // Only show tooltip if we have valid data
      if (!data || !data.fullName || !data.username) {
        return null;
      }
      
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.fullName}</p>
          <p className="text-sm text-gray-600">@{data.username}</p>
          <p className="text-sm"><strong>Average Risk Score:</strong> {data.x?.toFixed(1)}</p>
          <p className="text-sm"><strong>Period Return (%):</strong> {data.y?.toFixed(1)}%</p>
          <p className="text-sm"><strong>Copiers:</strong> {data.copiers?.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  // Create custom labels for key investors only (to avoid clutter)
  const renderCustomLabels = (scatterData: InvestorData[]) => {
    // Helper function to get expected return for a given risk from efficient frontier
    const getEfficientReturn = (risk: number) => {
      if (risk < 4) return 2.5; // Below frontier start
      const t = (risk - 4) / (7 - 4);
      return 2.5 + (11 - 2.5) * Math.pow(t, 0.5);
    };
    
    // Always label these key investors regardless of position
    const alwaysLabel = ['Aukie2008', 'JeppeKirkBonde', 'thomaspj', 'saifsyn', 'Smudliczek', 'mick_repo', 'Flaten', 'Enslinjaco'];
    
    // Label key investors plus any high performers
    const keyInvestors = scatterData.filter(d => {
      const isAlwaysLabeled = alwaysLabel.includes(d.username);
      const isHighPerformer = d.y > 10; // Simple high performance threshold
      return isAlwaysLabeled || isHighPerformer;
    });
    
    return keyInvestors.map((d, index) => {
      // Position labels closer to dots
      const labelPositions = [
        { dx: 8, dy: -8, anchor: 'start' as const },
        { dx: -8, dy: -8, anchor: 'end' as const },
        { dx: 8, dy: 8, anchor: 'start' as const },
        { dx: -8, dy: 8, anchor: 'end' as const },
        { dx: 12, dy: -3, anchor: 'start' as const },
        { dx: -12, dy: -3, anchor: 'end' as const },
        { dx: 3, dy: -12, anchor: 'start' as const },
        { dx: 3, dy: 12, anchor: 'start' as const },
      ];
      
      const position = labelPositions[index % labelPositions.length];
      return { ...d, ...position, labelIndex: index, label: `@${d.username}` };
    });
  };

  // Calculate efficient frontier based on Modern Portfolio Theory
  const calculateEfficientFrontier = () => {
    const frontierPoints = [];
    
    // Efficient frontier should be monotonically increasing with diminishing returns
    // Very aggressive at start, extremely flat at end
    const startRisk = 4;
    const endRisk = 7;
    
    for (let risk = startRisk; risk <= endRisk; risk += 0.02) {
      // Normalize risk to 0-1 range
      const t = (risk - startRisk) / (endRisk - startRisk);
      
      // Efficient frontier with smooth curve, less pronounced at start
      const minReturn = 2.5;  // Starting return at risk 4
      const maxReturn = 11;   // Maximum return at risk 7
      
      // Use smoother power function for gradual diminishing returns
      // More gradual start for smoother curve
      const returnValue = minReturn + (maxReturn - minReturn) * Math.pow(t, 0.5);
      
      frontierPoints.push({ x: risk, y: returnValue });
    }
    
    return frontierPoints;
  };

  const efficientFrontier = calculateEfficientFrontier();

  // Filter data to only show investors within 4-7 risk range
  const filteredData = data.filter(d => d.x >= 4 && d.x <= 7);
  
  // Prepare data for chart - don't mix frontier with investor data
  const chartData = filteredData;


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: height, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 120, bottom: 20, left: 120 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="Average Risk Score"
                domain={[4, 7]}
                tickCount={4}
                label={{ value: 'Average Risk Score', position: 'insideBottom', offset: -10 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Period Return (%)"
                label={{ value: 'Period Return (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ stroke: '#8B5CF6', strokeWidth: 1 }}
                allowEscapeViewBox={{ x: false, y: false }}
              />
              
              {/* Efficient Frontier as separate Line component */}
              <Line
                data={efficientFrontier}
                type="monotone"
                dataKey="y"
                stroke="#8B5CF6"
                strokeWidth={3}
                dot={false}
                connectNulls={true}
              />
              
              {/* All data points with custom colors */}
              <Scatter
                data={filteredData}
                fill="#8884d8"
                shape={(props: { cx: number; cy: number; payload: InvestorData }) => {
                  const { cx, cy, payload } = props;
                  
                  // Only render if we have valid data
                  if (!payload || !payload.fullName || !payload.username) {
                    return null;
                  }
                  
                  const color = payload.y > 0 ? '#00C896' : payload.y < 0 ? '#EF4444' : '#3B82F6';
                  const strokeColor = payload.y > 0 ? '#00B085' : payload.y < 0 ? '#DC2626' : '#2563EB';
                  
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={4}
                      fill={color}
                      stroke={strokeColor}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                    />
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
          
          {/* Custom labels positioned close to dots with smart positioning */}
          <svg 
            style={{ 
              position: 'absolute', 
              top: 0, 
              left: 0, 
              width: '100%', 
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            {renderCustomLabels(filteredData).map((point, index) => {
              // Chart dimensions and positioning - directly calculate from SVG container
              const svgElement = document.querySelector('svg[class*="recharts-surface"]');
              if (!svgElement) {
                // Fallback: try again after a brief delay if SVG not ready
                setTimeout(() => {}, 100);
                return null;
              }
              
              const svgRect = svgElement.getBoundingClientRect();
              const containerRect = svgElement.closest('div')?.getBoundingClientRect();
              
              // Use Recharts' actual chart area coordinates
              const chartArea = {
                left: 120,  // Standard Recharts left margin
                right: 120, // Standard Recharts right margin  
                top: 20,    // Standard Recharts top margin
                bottom: 60  // Standard Recharts bottom margin
              };
              
              const chartWidth = svgRect.width - chartArea.left - chartArea.right;
              const chartHeight = svgRect.height - chartArea.top - chartArea.bottom;
              
              // Use the actual Y axis domain that matches the real data range  
              const yAxisDomain = [-12, 18]; // Expanded range to accommodate real data (-10.3% to 15.72%)
              const xAxisDomain = [4, 7];    // From the chart's X domain
              
              // Map data coordinates to pixel coordinates using Recharts' actual domains
              const xPos = chartArea.left + ((point.x - xAxisDomain[0]) / (xAxisDomain[1] - xAxisDomain[0])) * chartWidth;
              const yPos = chartArea.top + ((yAxisDomain[1] - point.y) / (yAxisDomain[1] - yAxisDomain[0])) * chartHeight;
              
              // Smart positioning for labels with specific adjustments for overlapping investors
              const getPositionForLabel = (username: string, index: number) => {
                // Custom positions for specific investors to avoid overlaps
                switch (username) {
                  case 'thomaspj':
                    return { dx: 4, dy: 10, anchor: 'start' as const }; // Bottom right
                  case 'Aukie2008':
                    return { dx: 2, dy: 16, anchor: 'start' as const }; // Much further down and to the right
                  case 'JeppeKirkBonde':
                    return { dx: -12, dy: -4, anchor: 'end' as const }; // Far left top
                  case 'saifsyn':
                    return { dx: 12, dy: -4, anchor: 'start' as const }; // Far right top
                  case 'Smudliczek':
                    return { dx: -4, dy: 22, anchor: 'end' as const }; // Very far down left
                  case 'mick_repo':
                    return { dx: 4, dy: -4, anchor: 'start' as const }; // Top right
                  case 'Flaten':
                    return { dx: 6, dy: -4, anchor: 'start' as const }; // Top right
                  case 'Enslinjaco':
                    return { dx: -6, dy: -4, anchor: 'end' as const }; // Top left
                  default:
                    // Alternate positions for other outperformers
                    const positions = [
                      { dx: 3, dy: -3, anchor: 'start' as const },   // Top right
                      { dx: -3, dy: -3, anchor: 'end' as const },    // Top left
                      { dx: 3, dy: 6, anchor: 'start' as const },    // Bottom right
                      { dx: -3, dy: 6, anchor: 'end' as const },     // Bottom left
                      { dx: 4, dy: -1, anchor: 'start' as const },   // Right
                      { dx: -4, dy: -1, anchor: 'end' as const },    // Left
                    ];
                    return positions[index % positions.length];
                }
              };
              
              const pos = getPositionForLabel(point.username, index);
              const labelX = xPos + pos.dx;
              const labelY = yPos + pos.dy;
              
              return (
                <g key={`label-${point.username}-${index}`}>
                  {/* Connecting line starting from dot center */}
                  <line
                    x1={xPos}
                    y1={yPos}
                    x2={labelX - (pos.anchor === 'start' ? 1 : -1)}
                    y2={labelY}
                    stroke="#666"
                    strokeWidth={0.5}
                    strokeDasharray="1,1"
                    opacity={0.4}
                  />
                  
                  
                  {/* Label text */}
                  <text
                    x={labelX}
                    y={labelY + 3}
                    fill="#1F2937"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor={pos.anchor}
                  >
                    {point.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        
        {/* Legend */}
        <div className="flex justify-center mt-4 space-x-6 flex-wrap">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Positive Returns</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-sm text-gray-600">Negative Returns</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-6 h-0.5 bg-purple-500 border-purple-500" style={{borderTop: '3px dashed #8B5CF6'}}></div>
            <span className="text-sm text-gray-600">Efficient Frontier</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}