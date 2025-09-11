import React, { useState, useEffect } from 'react';
import { RiskMeter } from './meter/RiskMeter';
import { ImageModal } from './meter/ImageModal';
import { pestsData } from './meter/pestsData';
import { diseasesData } from './meter/diseasesData';
import { DetectionCard } from './meter/PestCard';
import { 
  generateRiskAssessment, 
  fetchPlantationDate, 
  fetchCurrentWeather,
  RiskAssessmentResult,
  WeatherData 
} from './meter/riskAssessmentService';

export const PestDisease: React.FC = () => {
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{ url: string; name: string } | null>(null);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<'High' | 'Moderate' | 'Low' | null>(null);
  const [expandedCardKey, setExpandedCardKey] = useState<string | null>(null);

  useEffect(() => {
    loadRiskAssessment();
  }, []);

  const loadRiskAssessment = async () => {
    try {
      setIsLoading(true);
      
      // Fetch plantation date and weather data
      const plantationDate = await fetchPlantationDate();
      const weatherData = await fetchCurrentWeather();
      
      // Generate risk assessment
      const assessment = await generateRiskAssessment(plantationDate, weatherData);
      setRiskAssessment(assessment);
      
    } catch (error) {
      console.error('Failed to load risk assessment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskCounts = () => {
    if (!riskAssessment) return { counts: { high: 0, moderate: 0, low: 0 }, pestsByRisk: { high: [], moderate: [], low: [] } };
    
    const counts = { 
      high: riskAssessment.pests.High.length, 
      moderate: riskAssessment.pests.Moderate.length, 
      low: riskAssessment.pests.Low.length 
    };
    
    const pestsByRisk = { 
      high: riskAssessment.pests.High, 
      moderate: riskAssessment.pests.Moderate, 
      low: riskAssessment.pests.Low 
    };
    
    return { counts, pestsByRisk };
  };

  const getDiseaseRiskTags = () => {
    if (!riskAssessment) return { high: [], moderate: [], low: [] };
    
    const diseasesByRisk = { 
      high: riskAssessment.diseases.High.map(name => {
        const disease = diseasesData.find(d => d.name === name);
        return {
          name: disease?.name || name,
          image: disease?.image || '/Image/wilt.png',
          months: disease?.months || [],
        };
      }), 
      moderate: riskAssessment.diseases.Moderate.map(name => {
        const disease = diseasesData.find(d => d.name === name);
        return {
          name: disease?.name || name,
          image: disease?.image || '/Image/wilt.png',
          months: disease?.months || [],
        };
      }), 
      low: riskAssessment.diseases.Low.map(name => {
        const disease = diseasesData.find(d => d.name === name);
        return {
          name: disease?.name || name,
          image: disease?.image || '/Image/wilt.png',
          months: disease?.months || [],
        };
      }) 
    };
    
    return diseasesByRisk;
  };

  const handleImageClick = (imageUrl: string, pestName: string) => {
    setSelectedImage({ url: imageUrl, name: pestName });
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const { counts, pestsByRisk } = getRiskCounts();
  const diseasesByRisk = getDiseaseRiskTags();
  
  // Calculate actual detected counts (pests and diseases that have any risk level)
  const totalPestsDetected = riskAssessment ? 
    riskAssessment.pests.High.length + riskAssessment.pests.Moderate.length + riskAssessment.pests.Low.length : 0;
  
  const totalDiseasesDetected = riskAssessment ? 
    riskAssessment.diseases.High.length + riskAssessment.diseases.Moderate.length + riskAssessment.diseases.Low.length : 0;

  const handleRiskClick = (level: 'High' | 'Moderate' | 'Low') => {
    setSelectedRiskLevel(prev => (prev === level ? null : level)); // toggle
  };

  const displayedPests = selectedRiskLevel
    ? pestsByRisk[selectedRiskLevel].map(name => {
        const pest = pestsData.find(p => p.name === name);
        return pest ? { name: pest.name, image: pest.image, months: pest.months } : null;
      }).filter(Boolean)
    : [];

  const displayedDiseases = selectedRiskLevel
    ? diseasesByRisk[selectedRiskLevel]
    : [];

  if (!riskAssessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading risk assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 text-center mb-4 sm:mb-6">
            Pest & Diseases Risk Assessment
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6 items-stretch">
            {(['high', 'moderate', 'low'] as const).map(level => (
              <div key={level} onClick={() => handleRiskClick(level)} className="cursor-pointer flex justify-center">
                <RiskMeter
                  riskLevel={level}
                  count={counts[level]}
                  detectedPests={pestsByRisk[level]}
                  detectedDiseases={diseasesByRisk[level]}
                />
              </div>
            ))}
          </div>

          {/* Total Pests Number and Label After RiskMeter */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-12 my-4 sm:my-8">
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-5xl text-red-600 font-extrabold">{totalPestsDetected}</span>
              <span className="text-sm sm:text-lg text-gray-700 font-semibold mt-1 text-center">Total Pests detected</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-3xl sm:text-5xl text-blue-600 font-extrabold">{totalDiseasesDetected}</span>
              <span className="text-sm sm:text-lg text-gray-700 font-semibold mt-1 text-center">Total Diseases detected</span>
            </div>
          </div>
        </div>

        {/* Conditionally Render Based on Selected Risk Level */}
        {selectedRiskLevel && (
          <div className="mb-6 sm:mb-10">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 capitalize mb-3 sm:mb-4">
              {selectedRiskLevel} Risk Pests ({displayedPests.length})
            </h3>

            {displayedPests.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
                {displayedPests.map((pest, index) => {
                  const cardKey = `pest-${pest.name}-${index}`;
                  return (
                    <DetectionCard
                      key={cardKey}
                      type="pest"
                      data={pest}
                      riskLevel={selectedRiskLevel}
                      onImageClick={handleImageClick}
                      isExpanded={expandedCardKey === cardKey}
                      onExpand={() => setExpandedCardKey(expandedCardKey === cardKey ? null : cardKey)}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 font-medium">No pest detected</p>
            )}
          </div>
        )}

        {/* Disease Cards */}
        {selectedRiskLevel && (
          <div className="mb-6 sm:mb-10">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800 capitalize mb-3 sm:mb-4">
              {selectedRiskLevel} Risk Diseases ({displayedDiseases.length})
            </h3>
            {displayedDiseases.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
                {displayedDiseases.map((disease, index) => {
                  const cardKey = `disease-${disease.name}-${index}`;
                  return (
                    <DetectionCard
                      key={cardKey}
                      type="disease"
                      data={disease}
                      riskLevel={selectedRiskLevel}
                      onImageClick={handleImageClick}
                      isExpanded={expandedCardKey === cardKey}
                      onExpand={() => setExpandedCardKey(expandedCardKey === cardKey ? null : cardKey)}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-gray-500 font-medium">No disease detected</p>
            )}
          </div>
        )}

        <ImageModal
          isOpen={!!selectedImage}
          imageUrl={selectedImage?.url || ''}
          pestName={selectedImage?.name || ''}
          onClose={closeImageModal}
        />
      </div>
    </div>
  );
};
