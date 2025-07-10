'use client';

import { ComposedChart, Scatter, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface InvestorData {
  x: number;
  y: number;
  username: string;
  fullName?: string;
  copiers: number;
  highlighted?: boolean;
}

interface RiskReturnChartProps {
  data: InvestorData[];
  highlightUsers?: string[];
  efficientFrontier?: Array<{ x: number; y: number }>;
  title?: string;
  width?: number;
  height?: number;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-gray-900 mb-1">
          @{data.username}
        </p>
        {data.fullName && (
          <p className="text-sm text-gray-600 mb-1">{data.fullName}</p>
        )}
        <p className="text-sm text-gray-600">
          Risk: {data.x.toFixed(1)} | Return: {data.y.toFixed(1)}%
        </p>
        <p className="text-sm text-gray-600">
          Copiers: {data.copiers?.toLocaleString()}
        </p>
      </div>
    );
  }
  return null;
};

export default function RiskReturnChart({
  data,
  highlightUsers = [],
  efficientFrontier = [],
  title = "Risk vs Return Analysis",
  width = 800,
  height = 600
}: RiskReturnChartProps) {
  
  const getPointColor = (entry: InvestorData) => {
    if (entry.highlighted || highlightUsers.includes(entry.username)) {
      return '#9333ea'; // Purple for highlighted users (including menago76)
    }
    return '#00C896'; // eToro green for others
  };

  const getPointSize = (entry: InvestorData) => {
    if (entry.highlighted || highlightUsers.includes(entry.username)) {
      return 8; // Larger for highlighted
    }
    // Size based on copiers count, with reasonable bounds
    return Math.max(3, Math.min(8, entry.copiers / 5000));
  };

  // Custom label positioning for specific investors
  const getLabelPosition = (username: string, x: number, y: number) => {
    const positions: Record<string, { dx: number; dy: number }> = {
      'menago76': { dx: 10, dy: -10 }, // Purple dot positioning
      'thomaspj': { dx: -40, dy: -15 },
      'JeppeKirkBonde': { dx: 10, dy: -15 },
      'aukie': { dx: -30, dy: 15 },
      'smud': { dx: 10, dy: 20 },
      'saifsyn': { dx: -35, dy: -15 },
    };
    
    return positions[username] || { dx: 10, dy: -10 };
  };

  // Filter data to risk range 4-7
  const filteredData = data.filter(d => d.x >= 4 && d.x <= 7);
  
  // Get notable investors for labeling
  const notableInvestors = filteredData
    .filter(d => d.copiers > 5000 || highlightUsers.includes(d.username))
    .sort((a, b) => b.copiers - a.copiers);

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600">
          Modern Portfolio Theory Analysis with {highlightUsers.length > 0 ? `@${highlightUsers.join(', @')} highlighted` : 'eToro Popular Investors'}
        </p>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={filteredData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis 
              type="number" 
              dataKey="x" 
              domain={[4, 7]}
              tickCount={4}
              label={{ value: 'Average Risk Score', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              domain={['dataMin - 1', 'dataMax + 1']}
              label={{ value: 'Period Return (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Efficient Frontier */}
            {efficientFrontier.length > 0 && (
              <Line 
                data={efficientFrontier} 
                type="monotone" 
                dataKey="y" 
                stroke="#94a3b8" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
              />
            )}
            
            {/* Scatter points */}
            <Scatter dataKey="y" fill="#00C896">
              {filteredData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getPointColor(entry)}
                  r={getPointSize(entry)}
                />
              ))}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>

        {/* Custom labels for notable investors */}
        <div className="relative">
          {notableInvestors.map((investor) => {
            const position = getLabelPosition(investor.username, investor.x, investor.y);
            const isHighlighted = investor.highlighted || highlightUsers.includes(investor.username);
            
            return (
              <div
                key={investor.username}
                className={`absolute text-xs font-medium ${
                  isHighlighted ? 'text-purple-700 font-bold' : 'text-gray-700'
                }`}
                style={{
                  // Position calculation would need actual chart coordinates
                  // This is a simplified version for demo
                  left: `${((investor.x - 4) / 3) * 100}%`,
                  top: `${100 - ((investor.y + 2) / 14) * 100}%`,
                  transform: `translate(${position.dx}px, ${position.dy}px)`
                }}
              >
                @{investor.username}
                {isHighlighted && ' 🟣'}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center items-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#00C896]"></div>
          <span>Regular Investors</span>
        </div>
        {highlightUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-600"></div>
            <span>Highlighted (@{highlightUsers.join(', @')})</span>
          </div>
        )}
        {efficientFrontier.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-0 border-t-2 border-gray-400 border-dashed"></div>
            <span>Efficient Frontier</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#00C896]">{filteredData.length}</div>
          <div className="text-sm text-gray-600">Total Investors</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#00C896]">4.0 - 7.0</div>
          <div className="text-sm text-gray-600">Risk Range</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-[#00C896]">
            {Math.min(...filteredData.map(d => d.y)).toFixed(1)}% - {Math.max(...filteredData.map(d => d.y)).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Return Range</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {highlightUsers.length || 'None'}
          </div>
          <div className="text-sm text-gray-600">Highlighted</div>
        </div>
      </div>
    </div>
  );
}