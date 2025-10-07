
// src/components/CropHealthAnalysis.tsx
import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, Info, Satellite } from 'lucide-react';
import { pestsData } from './pestt/meter/pestsData';
import { diseasesData } from './pestt/meter/diseasesData';
import { 
  generateRiskAssessment, 
  fetchPlantationDate, 
  fetchCurrentWeather,
  RiskAssessmentResult,
  WeatherData 
} from './pestt/meter/riskAssessmentService';

interface Disease {
  name: string;
  symptoms: string[];
  organic: string[];
  chemical: string[];
  probability: string;
}

interface PestControl {
  pest: string;
  probability: string;
  organic: string;
  chemical: string;
}

// Enhanced MeasureWithInfo component with better mobile support
const MeasureWithInfo: React.FC<{ measure: string }> = ({ measure }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const tooltipRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (hoveredIndex !== null && tooltipRefs.current[hoveredIndex]) {
        const tooltipElement = tooltipRefs.current[hoveredIndex];
        if (tooltipElement && !tooltipElement.contains(event.target as Node)) {
          setHoveredIndex(null);
        }
      }
    };

    if (isMobile && hoveredIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [hoveredIndex, isMobile]);

  const parts = measure.split(/[,;]/).map(part => part.trim());

  const handleTooltipToggle = (index: number) => {
    if (isMobile) {
      setHoveredIndex(hoveredIndex === index ? null : index);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs">
      {parts.map((item, index) => {
        const [main, ...details] = item.split(/[-–]/);
        const detailText = details.join('-').trim();
        const parenMatch = main.match(/^(.*?)\((.*?)\)$/);
        const mainText = parenMatch ? parenMatch[1].trim() : main.trim();
        const parenText = parenMatch ? parenMatch[2].trim() : '';

        let tooltipText = '';
        if (detailText && parenText) {
          tooltipText = `${detailText}; ${parenText}`;
        } else if (detailText) {
          tooltipText = detailText;
        } else if (parenText) {
          tooltipText = parenText;
        }

        return (
          <div key={index} className="relative inline-flex items-center gap-0.5">
            <span className="font-medium">{mainText}</span>
            {tooltipText && (
              <div 
                className="relative inline-block"
                ref={(el) => { tooltipRefs.current[index] = el; }}
              >
                <Info 
                  className="w-3 h-3 text-red-600 cursor-pointer hover:text-red-800 transition-colors"
                  onMouseEnter={() => !isMobile && setHoveredIndex(index)}
                  onMouseLeave={() => !isMobile && setHoveredIndex(null)}
                  onClick={() => handleTooltipToggle(index)}
                />
                {hoveredIndex === index && (
                  <div className={`absolute z-50 px-2 py-1 text-xs text-red-600 bg-white border border-red-300 shadow-lg rounded whitespace-normal break-words font-semibold ${
                    isMobile 
                      ? 'top-full left-1/2 transform -translate-x-1/2 mt-1 w-48 max-w-xs' 
                      : 'bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-64 max-w-lg'
                  }`}>
                    {tooltipText}
                    <div className={`absolute w-2 h-2 bg-white border-l border-b border-red-300 transform rotate-45 ${
                      isMobile 
                        ? '-top-1 left-1/2 -translate-x-1/2' 
                        : '-bottom-1 left-1/2 -translate-x-1/2'
                    }`} />
                  </div>
                )}
              </div>
            )}
            {index < parts.length - 1 && <span className="text-gray-300">,</span>}
          </div>
        );
      })}
    </div>
  );
};

// Add weed data
const weedData = [
  {
    name: "Hariali",
    season: "February to May",
    chemical: "Fenoxaprop-p-ethyl 9.3% EC",
    dosage: "400 ml/acre in 150-200 l water",
    organic: "N/A",
  },
  {
    name: "Congress grass",
    season: "February to May",
    chemical: "2,4-D Sodium Salt 80% WP",
    dosage: "500-750 gm/acre in 150–200 L water",
    organic: "N/A",
  },
  {
    name: "Rajgira",
    season: "June to September",
    chemical: "Atrazine 50% WP",
    dosage: "500 gm/acre 150-200 water",
    organic: "N/A",
  },
  {
    name: "Samkhalu",
    season: "June to September",
    chemical: "Pendimethalin 30% EC",
    dosage: "750 to 1000 ml/acre in 150-200 water",
    organic: "N/A",
  },
  {
    name: "Bathua",
    season: "October to January",
    chemical: "2,4-D Sodium Salt 80% WP",
    dosage: "600-700 gm/acre 150-200 water",
    organic: "N/A",
  },
];

// Helper to check if current month is in season
function isCurrentMonthInSeason(season: string) {
  const month = new Date().getMonth(); // 0 = Jan
  const monthNames = [
    "january","february","march","april","may","june","july","august","september","october","november","december"
  ];
  const [start, , end] = season.toLowerCase().split(" ");
  const startIdx = monthNames.indexOf(start);
  const endIdx = monthNames.indexOf(end);

  if (startIdx === -1 || endIdx === -1) return false;

  if (startIdx <= endIdx) {
    return month >= startIdx && month <= endIdx;
  } else {
    // Season wraps around the year (e.g., October to January)
    return month >= startIdx || month <= endIdx;
  }
}

// Enhanced InfoTooltip component with better responsive behavior
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close tooltip when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (show && tooltipRef.current && !tooltipRef.current.contains(event.target as Node) && 
          iconRef.current && !iconRef.current.contains(event.target as Node)) {
        setShow(false);
      }
    };

    if (isMobile && show) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [show, isMobile]);

  const handleToggle = () => {
    if (isMobile) {
      setShow(!show);
    }
  };

  return (
    <span ref={iconRef} className="relative inline-flex items-center ml-1">
      <Info 
        className="w-4 h-4 text-blue-600 cursor-pointer hover:text-blue-800 transition-colors"
        onMouseEnter={() => !isMobile && setShow(true)}
        onMouseLeave={() => !isMobile && setShow(false)}
        onClick={handleToggle}
      />
      {show && (
        <div 
          ref={tooltipRef}
          className={`absolute z-50 px-3 py-2 text-xs text-blue-700 bg-white border border-blue-300 shadow-lg rounded whitespace-normal break-words font-semibold ${
            isMobile 
              ? 'top-full left-1/2 transform -translate-x-1/2 mt-2 w-48 max-w-xs' 
              : 'bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 max-w-sm'
          }`}
        >
          {text}
          <div className={`absolute w-2 h-2 bg-white border-l border-b border-blue-300 transform rotate-45 ${
            isMobile 
              ? '-top-1 left-1/2 -translate-x-1/2' 
              : '-bottom-1 left-1/2 -translate-x-1/2'
          }`} />
        </div>
      )}
    </span>
  );
};

const CropHealthAnalysis: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pests' | 'diseases' | 'weeds'>('pests');
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRiskAssessment();
  }, []);

  const loadRiskAssessment = async () => {
    try {
      setLoading(true);
      
      // Fetch plantation date and weather data
      const plantationDate = await fetchPlantationDate();
      const weatherData = await fetchCurrentWeather();
      
      // Generate risk assessment
      const assessment = await generateRiskAssessment(plantationDate, weatherData);
      setRiskAssessment(assessment);
      
    } catch (error) {
      console.error('Failed to load risk assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate pest controls from risk assessment data
  const generatePestControls = (): PestControl[] => {
    if (!riskAssessment) return [];

    const pestControls: PestControl[] = [];

    // Add High risk pests
    riskAssessment.pests.High.forEach(pestName => {
      const pest = pestsData.find(p => p.name === pestName);
      if (pest) {
        pestControls.push({
          pest: pest.name,
          probability: "High",
          organic: pest.organic.join(', '),
          chemical: pest.chemical.join(', ')
        });
      }
    });

    // Add Moderate risk pests
    riskAssessment.pests.Moderate.forEach(pestName => {
      const pest = pestsData.find(p => p.name === pestName);
      if (pest) {
        pestControls.push({
          pest: pest.name,
          probability: "Moderate",
          organic: pest.organic.join(', '),
          chemical: pest.chemical.join(', ')
        });
      }
    });

    // Add Low risk pests
    riskAssessment.pests.Low.forEach(pestName => {
      const pest = pestsData.find(p => p.name === pestName);
      if (pest) {
        pestControls.push({
          pest: pest.name,
          probability: "Low",
          organic: pest.organic.join(', '),
          chemical: pest.chemical.join(', ')
        });
      }
    });

    return pestControls;
  };

  // Generate disease risks from risk assessment data
  const generateDiseaseRisks = (): Disease[] => {
    if (!riskAssessment) return [];

    const diseaseRisks: Disease[] = [];

    // Add High risk diseases
    riskAssessment.diseases.High.forEach(diseaseName => {
      const disease = diseasesData.find(d => d.name === diseaseName);
      if (disease) {
        diseaseRisks.push({
          name: disease.name,
          symptoms: disease.symptoms,
          organic: disease.organic,
          chemical: disease.chemical,
          probability: "High"
        });
      }
    });

    // Add Moderate risk diseases
    riskAssessment.diseases.Moderate.forEach(diseaseName => {
      const disease = diseasesData.find(d => d.name === diseaseName);
      if (disease) {
        diseaseRisks.push({
          name: disease.name,
          symptoms: disease.symptoms,
          organic: disease.organic,
          chemical: disease.chemical,
          probability: "Moderate"
        });
      }
    });

    // Add Low risk diseases
    riskAssessment.diseases.Low.forEach(diseaseName => {
      const disease = diseasesData.find(d => d.name === diseaseName);
      if (disease) {
        diseaseRisks.push({
          name: disease.name,
          symptoms: disease.symptoms,
          organic: disease.organic,
          chemical: disease.chemical,
          probability: "Low"
        });
      }
    });

    return diseaseRisks;
  };

  const pestControls = generatePestControls();
  const diseaseRisks = generateDiseaseRisks();

  const handleDownloadPestsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Crop Health - Pest Control Measures', 14, 15);
    autoTable(doc, {
      startY: 25,
      head: [['Pest', 'Probability', 'Organic Control', 'Chemical Control']],
      body: pestControls.map(pc => [
        pc.pest,
        pc.probability,
        pc.organic,
        pc.chemical
      ]),
      headStyles: { fillColor: [220, 38, 38] },
      theme: 'grid'
    });
    doc.save('Pest_Control_Measures.pdf');
  };

  const handleDownloadDiseasesPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Crop Health - Disease Report', 14, 15);
    autoTable(doc, {
      startY: 25,
      head: [['Disease', 'Probability', 'Organic Control', 'Chemical Control']],
      body: diseaseRisks.map(d => [
        d.name,
        d.probability,
        d.organic.join('; '),
        d.chemical.join('; ')
      ]),
      headStyles: { fillColor: [59, 130, 246] },
      theme: 'grid'
    });
    doc.save('Disease_Report.pdf');
  };

  if (loading) {
    return (
      <div className="card h-full flex flex-col min-h-[520px]">
        <div className="card-header">
          <h2 className="text-xl font-bold text-green-700">Crop Health Analysis</h2>
        </div>
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="animate-spin mx-auto mb-4">
              {/* <Satellite className="h-12 w-12 text-blue-500" /> */}
            </div>
            <p className="text-gray-600">Loading risk assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card h-full flex flex-col min-h-[520px]">
      <div className="card-header flex justify-between items-center">
        <h2 className="text-xl font-bold text-green-700">Crop Health Analysis</h2>
        {activeTab === 'pests' && (
          <button
            onClick={handleDownloadPestsPDF}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        )}
        {activeTab === 'diseases' && (
          <button
            onClick={handleDownloadDiseasesPDF}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        )}
      </div>

      <div className="flex border-b mt-2">
        {(['pests', 'diseases', 'weeds'] as const).map(tab => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`cursor-pointer px-4 py-2 ${
              activeTab === tab
                ? 'border-b-2 border-green-600 font-semibold text-green-800'
                : 'text-gray-600 hover:text-green-600'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </div>
        ))}
      </div>

      <div className="p-4 flex-1">
        {activeTab === 'pests' && (
          <div className="overflow-x-auto sm:overflow-x-hidden w-full scroll-hide">
            {pestControls.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 font-medium">No pests detected in current conditions</p>
                <p className="text-sm text-gray-400 mt-2">Risk assessment shows no pest threats at this time</p>
              </div>
            ) : (
              <>
                <table className="min-w-full border text-xs md:text-sm">
                  <thead className="bg-red-200">
                    <tr>
                      <th className="py-2 px-2 font-bold text-left">Pest</th>
                      <th className="py-2 px-2 font-bold text-left">Probability</th>
                      <th className="py-2 px-2 font-bold text-left">Organic Control</th>
                      <th className="py-2 px-2 font-bold text-left">Chemical Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pestControls.map((pc, idx) => (
                      <tr key={`${pc.pest}-${idx}`} className="border-b last:border-0 hover:bg-red-50">
                        <td className="py-2 px-2 font-semibold">{pc.pest}</td>
                        <td className="py-2 px-2">
                          <span className={`font-bold ${
                            pc.probability === 'High' ? 'text-red-600' : 
                            pc.probability === 'Moderate' ? 'text-orange-600' : 'text-yellow-600'
                          }`}>
                            {pc.probability}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <MeasureWithInfo measure={pc.organic} />
                        </td>
                        <td className="py-2 px-2">
                          <MeasureWithInfo measure={pc.chemical} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {activeTab === 'diseases' && (
          <div className="overflow-x-auto w-full">
            {diseaseRisks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 font-medium">No diseases detected in current conditions</p>
                <p className="text-sm text-gray-400 mt-2">Risk assessment shows no disease threats at this time</p>
              </div>
            ) : (
              <>
                <table className="min-w-full border text-xs md:text-sm">
                  <thead className="bg-blue-200">
                    <tr>
                      <th className="py-2 px-2 font-bold text-left">Disease</th>
                      <th className="py-2 px-2 font-bold text-left">Probability</th>
                      <th className="py-2 px-2 font-bold text-left">Organic Control</th>
                      <th className="py-2 px-2 font-bold text-left">Chemical Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diseaseRisks.map((disease, idx) => (
                      <tr key={`${disease.name}-${idx}`} className="border-b last:border-0 hover:bg-blue-50">
                        <td className="py-3 px-2 font-semibold">{disease.name}</td>
                        <td className="py-3 px-2">
                          <span className={`font-bold capitalize ${
                            disease.probability === 'High' ? 'text-red-600' : 
                            disease.probability === 'Moderate' ? 'text-orange-600' : 'text-yellow-600'
                          }`}>
                            {disease.probability}
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <MeasureWithInfo measure={disease.organic.join(', ')} />
                        </td>
                        <td className="py-3 px-2">
                          <MeasureWithInfo measure={disease.chemical.join(', ')} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {activeTab === 'weeds' && (
          <div className="overflow-x-auto w-full">
            <table className="min-w-full table-auto border border-gray-200 rounded-lg text-xs md:text-sm">
              <thead className="bg-green-100">
                <tr>
                  <th className="px-2 py-2 border text-left font-bold">Weed</th>
                  <th className="px-2 py-2 border text-left font-bold">Probability</th>
                  <th className="px-2 py-2 border text-left font-bold">Chemical Control</th>
                </tr>
              </thead>
              <tbody>
                {weedData.map((weed, idx) => {
                  const isHigh = isCurrentMonthInSeason(weed.season);
                  return (
                    <tr key={idx} className="border-b hover:bg-green-50">
                      <td className="px-2 py-2 border font-bold">{weed.name}</td>
                      <td className="px-2 py-2 border">
                        <span className={`font-bold ${isHigh ? 'text-red-600' : 'text-gray-500'}`}>
                          {isHigh ? 'High' : 'Low'}
                        </span>
                      </td>
                      <td className="px-2 py-2 border">
                        <span className="inline-flex items-center">
                          {weed.chemical}
                          <InfoTooltip text={weed.dosage} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default CropHealthAnalysis;