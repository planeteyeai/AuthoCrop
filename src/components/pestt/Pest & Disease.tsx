import React, { useState, useEffect } from 'react';
import { SingleCategoryRiskMeter } from './meter/SingleCategoryRiskMeter';
import { ImageModal } from './meter/ImageModal';
import { pestsData } from './meter/pestsData';
import { diseasesData } from './meter/diseasesData';
import { weedsData } from './meter/Weeds';
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
  const [selectedCategory, setSelectedCategory] = useState<'Pests' | 'Diseases' | 'Weeds' | null>(null);
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

  const handleRiskClick = (category: 'Pests' | 'Diseases' | 'Weeds', level: 'High' | 'Moderate' | 'Low') => {
    // If clicking the same category and level, deselect
    if (selectedCategory === category && selectedRiskLevel === level) {
      setSelectedCategory(null);
      setSelectedRiskLevel(null);
    } else {
      setSelectedCategory(category);
      setSelectedRiskLevel(level);
    }
  };

  const displayedPests = selectedRiskLevel
    ? pestsByRisk[selectedRiskLevel.toLowerCase() as 'high' | 'moderate' | 'low'].map((name: string) => {
        const pest = pestsData.find(p => p.name === name);
        return pest ? { name: pest.name, image: pest.image, months: pest.months } : null;
      }).filter(Boolean)
    : [];

  const displayedDiseases = selectedRiskLevel
    ? diseasesByRisk[selectedRiskLevel.toLowerCase() as 'high' | 'moderate' | 'low']
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
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 text-center mb-4 sm:mb-6 px-2">
            Pest & Diseases Weeds Risk Assessment
          </h2>

          {/* Three Separate Risk Meters - One for each category */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {/* Pests Risk Meter */}
            <SingleCategoryRiskMeter
              category="Pests"
              highCount={counts.high}
              moderateCount={counts.moderate}
              lowCount={counts.low}
              // icon="🦗"
              onRiskClick={handleRiskClick}
              selectedCategory={selectedCategory}
              selectedRiskLevel={selectedRiskLevel}
            />

            {/* Diseases Risk Meter */}
            <SingleCategoryRiskMeter
              category="Diseases"
              highCount={riskAssessment?.diseases.High.length || 0}
              moderateCount={riskAssessment?.diseases.Moderate.length || 0}
              lowCount={riskAssessment?.diseases.Low.length || 0}
              // icon="🦠"
              onRiskClick={handleRiskClick}
              selectedCategory={selectedCategory}
              selectedRiskLevel={selectedRiskLevel}
            />

            {/* Weeds Risk Meter */}
            <SingleCategoryRiskMeter
              category="Weeds"
              highCount={2}
              moderateCount={2}
              lowCount={1}
              // icon="🌿"
              onRiskClick={handleRiskClick}
              selectedCategory={selectedCategory}
              selectedRiskLevel={selectedRiskLevel}
            />
          </div>
        </div>

        {/* Conditionally Render Based on Selected Category and Risk Level */}
        {selectedCategory === 'Pests' && selectedRiskLevel && (
          <div className="mb-6 sm:mb-10 px-2 sm:px-0">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 capitalize mb-3 sm:mb-4">
              {selectedRiskLevel} Risk Pests ({displayedPests.length})
            </h3>

            {displayedPests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 items-start">
                {displayedPests.map((pest: any, index: number) => {
                  const cardKey = `pest-${pest.name}-${index}`;
                  return (
                    <DetectionCard
                      key={cardKey}
                      type="pest"
                      data={pest}
                      riskLevel={selectedRiskLevel?.toLowerCase() as 'high' | 'moderate' | 'low'}
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
        {selectedCategory === 'Diseases' && selectedRiskLevel && (
          <div className="mb-6 sm:mb-10 px-2 sm:px-0">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 capitalize mb-3 sm:mb-4">
              {selectedRiskLevel} Risk Diseases ({displayedDiseases.length})
            </h3>
            {displayedDiseases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 items-start">
                {displayedDiseases.map((disease: any, index: number) => {
                  const cardKey = `disease-${disease.name}-${index}`;
                  return (
                    <DetectionCard
                      key={cardKey}
                      type="disease"
                      data={disease}
                      riskLevel={selectedRiskLevel?.toLowerCase() as 'high' | 'moderate' | 'low'}
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

        {/* Weeds Cards */}
        {selectedCategory === 'Weeds' && selectedRiskLevel && (
          <div className="mb-6 sm:mb-10 px-2 sm:px-0">
            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 capitalize mb-3 sm:mb-4">
              {selectedRiskLevel} Risk Weeds
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
              {(() => {
                // Filter weeds based on selected risk level
                let filteredWeeds;
                if (selectedRiskLevel === 'High') {
                  filteredWeeds = weedsData.slice(0, 2); // First 2 weeds for High risk
                } else if (selectedRiskLevel === 'Moderate') {
                  filteredWeeds = weedsData.slice(2, 4); // Next 2 weeds for Moderate risk
                } else {
                  filteredWeeds = weedsData.slice(4, 5); // Last 1 weed for Low risk
                }
                
                return filteredWeeds.map((weed, index) => (
                  <div key={index} className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-lg border-2 border-gray-200 hover:shadow-xl transition-shadow">
                    <h4 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                      <span className="text-xl sm:text-2xl">🌿</span>
                      {weed.name}
                    </h4>
                    <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                      <div className="flex flex-col sm:flex-row sm:items-start">
                        <span className="font-semibold text-gray-700 sm:w-28 mb-1 sm:mb-0">Season:</span>
                        <span className="text-gray-600">{weed.season}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-start">
                        <span className="font-semibold text-gray-700 sm:w-28 mb-1 sm:mb-0">Chemical:</span>
                        <span className="text-gray-600 break-words">{weed.chemical}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-start">
                        <span className="font-semibold text-gray-700 sm:w-28 mb-1 sm:mb-0">Dosage:</span>
                        <span className="text-gray-600 break-words">{weed.dosage}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-start">
                        <span className="font-semibold text-gray-700 sm:w-28 mb-1 sm:mb-0">Organic:</span>
                        <span className="text-gray-600">{weed.organic}</span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
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
