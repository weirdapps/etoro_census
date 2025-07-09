'use client';

import { useEffect, useState } from 'react';
import RiskReturnScatter from '@/components/census/risk-return-scatter';

interface InvestorData {
  x: number;
  y: number;
  username: string;
  fullName: string;
  copiers: number;
  label?: string;
}

export default function RiskReturnAnalysisPage() {
  const [chartData, setChartData] = useState<InvestorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadChartData() {
      try {
        // Real eToro investor data from latest analysis (May 31 - July 9, 2025)
        // Risk range filtered to 4.0-7.0, outliers removed
        const analysisData: InvestorData[] = [
          { x: 5.54, y: 11.12, username: 'thomaspj', fullName: 'Thomas Parry Jones', copiers: 40343, label: '@thomaspj' },
          { x: 5, y: 7.63, username: 'JeppeKirkBonde', fullName: 'Jeppe Kirk Bonde', copiers: 28988, label: '@JeppeKirkBonde' },
          { x: 5.38, y: 5.64, username: 'CPHequities', fullName: 'Blue Screen Media ApS', copiers: 13653, label: '@CPHequities' },
          { x: 5, y: 1.36, username: 'triangulacapital', fullName: 'Pietari Laurila', copiers: 13397, label: '@triangulacapital' },
          { x: 5.84, y: 6.52, username: 'jaynemesis', fullName: 'Jay Smith', copiers: 10260, label: '@jaynemesis' },
          { x: 5, y: 6.62, username: 'FundManagerZech', fullName: 'Zechariah Bin Zheng', copiers: 9366, label: '@FundManagerZech' },
          { x: 6, y: 0.07, username: 'Napoleon-X', fullName: 'CoinShares France SAS', copiers: 9059, label: '@Napoleon-X' },
          { x: 5.91, y: 2.43, username: 'AmitKup', fullName: 'Amit Kupfer', copiers: 8310, label: '@AmitKup' },
          { x: 5.32, y: 3.06, username: 'GreenbullInvest', fullName: 'Greenbull Investments Sarl', copiers: 6804, label: '@GreenbullInvest' },
          { x: 4.95, y: 7.83, username: 'saifsyn', fullName: 'Saif Alnaqbi', copiers: 6434, label: '@saifsyn' },
          { x: 5.88, y: 7.21, username: 'rubymza', fullName: 'Heloise Greeff', copiers: 6175, label: '@rubymza' },
          { x: 4.95, y: 5.82, username: 'defense_investor', fullName: 'Stewart Fitzell', copiers: 5443, label: '@defense_investor' },
          { x: 6, y: -0.53, username: 'misterg23', fullName: 'George Thomson', copiers: 3901, label: '@misterg23' },
          { x: 5, y: 3.3, username: 'Richardstroud', fullName: 'Richard Stroud', copiers: 3580, label: '@Richardstroud' },
          { x: 6, y: 8.72, username: 'Wesl3y', fullName: 'Wesley Nolte', copiers: 3568, label: '@Wesl3y' },
          { x: 4.98, y: 2.79, username: 'IlMatematico', fullName: 'Roberto Anzellotti', copiers: 3472, label: '@IlMatematico' },
          { x: 6, y: 7.62, username: 'MarianoPardo', fullName: 'Mariano Daniel Pardo', copiers: 3224, label: '@MarianoPardo' },
          { x: 5, y: 7.49, username: 'ingruc', fullName: 'Ingvar Rueckemann', copiers: 3122, label: '@ingruc' },
          { x: 4.3, y: 5.68, username: 'Aukie2008', fullName: 'Mike Moest', copiers: 2971, label: '@Aukie2008' },
          { x: 5, y: 15.5, username: 'mick_repo', fullName: 'Miska Repo', copiers: 2720, label: '@mick_repo' },
          { x: 5, y: 8.27, username: 'Smudliczek', fullName: 'Dan Hamerník', copiers: 2625, label: '@Smudliczek' },
          { x: 6, y: 6.62, username: 'steveli1029', fullName: 'Shao Feng Li', copiers: 2534, label: '@steveli1029' },
          { x: 5.57, y: 6.32, username: 'robchamow', fullName: 'Roberto Chamorro gilaberte', copiers: 2391, label: '@robchamow' },
          { x: 5, y: -0.7, username: 'adams302', fullName: 'Rhys Adams', copiers: 2198, label: '@adams302' },
          { x: 5.79, y: 13.47, username: 'Enslinjaco', fullName: 'Jacobus Enslin', copiers: 2181, label: '@Enslinjaco' },
          { x: 5.13, y: 2.89, username: 'Anders_', fullName: 'Anders Jensen', copiers: 1909, label: '@Anders_' },
          { x: 6, y: -2.1, username: 'KoraTrades', fullName: 'Mimi Ho', copiers: 1873, label: '@KoraTrades' },
          { x: 5, y: 6.06, username: 'eddyb123', fullName: 'Ed Butler', copiers: 1871, label: '@eddyb123' },
          { x: 4.77, y: 2.67, username: 'celesh', fullName: 'Celestino Brunetti', copiers: 1777, label: '@celesh' },
          { x: 5, y: -1.31, username: 'CCalle', fullName: 'Cristia Calle Mercado', copiers: 1776, label: '@CCalle' },
          { x: 6, y: 8.95, username: 'TheDividendFund', fullName: 'Jakub Rochlitz', copiers: 1758, label: '@TheDividendFund' },
          { x: 6.38, y: 3.11, username: 'brirap', fullName: 'Brian Rapose', copiers: 1722, label: '@brirap' },
          { x: 6.36, y: 7.14, username: 'hugomanenti95', fullName: 'Hugo Angelo Lucien Manenti', copiers: 1707, label: '@hugomanenti95' },
          { x: 6, y: 7.97, username: 'NabilSifo', fullName: 'Nabil Sifo', copiers: 1698, label: '@NabilSifo' },
          { x: 5, y: 4.94, username: 'GeorgeFatouros', fullName: 'Georgios Fatouros', copiers: 1534, label: '@GeorgeFatouros' },
          { x: 4.79, y: 1.89, username: 'Nezatron', fullName: 'Neza Molk', copiers: 1516, label: '@Nezatron' },
          { x: 6.54, y: 3.15, username: 'Kevin_Pando', fullName: 'Kevin Pando', copiers: 1513, label: '@Kevin_Pando' },
          { x: 5.32, y: 2.81, username: 'liborvasa', fullName: 'Libor Vasa', copiers: 1488, label: '@liborvasa' },
          { x: 5.59, y: 8.01, username: 'Miyoshi', fullName: 'Victor Pedersen', copiers: 1485, label: '@Miyoshi' },
          { x: 5.98, y: 5.15, username: 'Gserdan', fullName: 'Guillaume Serdan', copiers: 1485, label: '@Gserdan' },
          { x: 5.98, y: 2.56, username: 'Marco199610', fullName: 'Marco De Lio', copiers: 1408, label: '@Marco199610' },
          { x: 6, y: 8.03, username: 'StefanULS', fullName: 'Stefan Uleia', copiers: 1378, label: '@StefanULS' },
          { x: 6, y: 7.04, username: 'SharonConnolly', fullName: 'Sharon Connolly', copiers: 1365, label: '@SharonConnolly' },
          { x: 5, y: -0.15, username: 'Rayeiris', fullName: 'Rayeiris Maduro Rondon', copiers: 1301, label: '@Rayeiris' },
          { x: 6.04, y: 7.07, username: 'Linsanity1', fullName: 'Lin Liu', copiers: 1288, label: '@Linsanity1' },
          { x: 6, y: 15.72, username: 'Flaten', fullName: 'Sondre Flateraaker', copiers: 1239, label: '@Flaten' }
        ];

        setChartData(analysisData);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
        setLoading(false);
      }
    }

    loadChartData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading analysis data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  const positiveReturns = chartData.filter(d => d.y > 0).length;
  const positiveReturnPct = Math.round((positiveReturns / chartData.length) * 100);

  return (
    <div className="container mx-auto p-8">
      {/* Navigation */}
      <div className="flex justify-between items-center py-4 border-b mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Risk vs Return Analysis</h1>
        <div className="flex space-x-4">
          <a 
            href="/" 
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Census
          </a>
        </div>
      </div>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">
          Interactive analysis of risk-adjusted performance for top eToro Popular Investors
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{chartData.length}</div>
            <div className="text-sm text-gray-600">Investors Analyzed</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{positiveReturnPct}%</div>
            <div className="text-sm text-gray-600">Positive Returns</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">4.0-7.0</div>
            <div className="text-sm text-gray-600">Risk Score Range</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">40 days</div>
            <div className="text-sm text-gray-600">Analysis Period</div>
          </div>
        </div>
      </div>

      <RiskReturnScatter
        data={chartData}
        title="Risk vs Return: Top eToro Popular Investors"
        subtitle="Analysis Period: May 31 - July 9, 2025"
        height={600}
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Chart Features</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• <strong>Efficient Frontier:</strong> Purple curve shows theoretical optimal risk-return combinations</li>
            <li>• <strong>Color Coding:</strong> Green (positive returns), Red (negative returns)</li>
            <li>• <strong>Labeled Outperformers:</strong> Investors beating the efficient frontier are labeled</li>
            <li>• <strong>Interactive Tooltips:</strong> Hover for detailed investor information</li>
          </ul>
        </div>
        
        <div className="p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Key Insights</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• <strong>Optimal Range:</strong> 4.5-5.5 risk score for best risk-adjusted returns</li>
            <li>• <strong>Diminishing Returns:</strong> Beyond 6.0 risk score shows minimal benefit</li>
            <li>• <strong>Alpha Generation:</strong> Top performers consistently above theoretical curve</li>
            <li>• <strong>Risk Management:</strong> Lower risk doesn't guarantee lower returns</li>
          </ul>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          <strong>Disclaimer:</strong> This analysis is based on historical data from May 31 - July 9, 2025. 
          Past performance does not guarantee future results. One outlier (risk score &lt;4.0) excluded from visualization.
        </p>
      </div>
    </div>
  );
}