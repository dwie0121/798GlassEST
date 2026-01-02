
import React, { useState, useEffect } from 'react';
import { InventoryForm } from './components/InventoryForm';
import { InventoryDisplay } from './components/InventoryDisplay';
import { PriceEditor } from './components/PriceEditor';
import { ToolsModal } from './components/ToolsModal';
import { ClientPricingModal } from './components/ClientPricingModal';
import { calculateInventory } from './services/inventoryCalculator';
import type { Inventory, AluminumColor, Supplier, PriceList, MaterialPropertiesList, WindowInputs, ProjectInputs, SavedProject, WindowSeries } from './types';
import { WindowIcon, GithubIcon } from './components/Icons';
import { Supplier as SupplierEnum, WindowSeries as WindowSeriesEnum, WindowType } from './types';
import { defaultPrices } from './data/prices';
import { defaultMaterialProperties } from './data/materialProperties';

const getInitialClientName = (): string => {
  try {
    const savedData = localStorage.getItem('lastFormDetails');
    if (savedData) {
      const parsedData = JSON.parse(savedData) as { clientName?: string };
      return parsedData.clientName || '';
    }
  } catch (error) {
    console.error("Failed to load client name from localStorage", error);
  }
  return '';
};

const App: React.FC = () => {
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [isCalculated, setIsCalculated] = useState(false);
  const [windowCount, setWindowCount] = useState(0);
  const [calculatedWindows, setCalculatedWindows] = useState<WindowInputs[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier>(SupplierEnum.Best);
  const [isPriceEditorOpen, setIsPriceEditorOpen] = useState(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [isClientPricingModalOpen, setIsClientPricingModalOpen] = useState(false);
  const [clientName, setClientName] = useState(getInitialClientName);
  const [lastCalculationInputs, setLastCalculationInputs] = useState<ProjectInputs | null>(null);
  const [projectToLoad, setProjectToLoad] = useState<ProjectInputs | null>(null);
  const [notification, setNotification] = useState<string>('');

  // Lifted Calculation Configuration States
  const [dealPercentage, setDealPercentage] = useState(60);
  const [deliveryFee, setDeliveryFee] = useState<string>('');
  const [taxPercentage, setTaxPercentage] = useState<string>('');
  const [manualPricePerSqFt, setManualPricePerSqFt] = useState<string | null>(null);
  
  const [prices, setPrices] = useState<PriceList>(() => {
    try {
      const savedPrices = localStorage.getItem('customPrices');
      return savedPrices ? JSON.parse(savedPrices) : defaultPrices;
    } catch (error) {
      console.error("Failed to parse prices from localStorage", error);
      return defaultPrices;
    }
  });

  const [materialProperties, setMaterialProperties] = useState<MaterialPropertiesList>(() => {
    try {
      const savedProps = localStorage.getItem('materialProperties');
      return savedProps ? JSON.parse(savedProps) : defaultMaterialProperties;
    } catch (error) {
      console.error("Failed to parse material properties from localStorage", error);
      return defaultMaterialProperties;
    }
  });
  
  useEffect(() => {
    try {
      localStorage.setItem('customPrices', JSON.stringify(prices));
      localStorage.setItem('materialProperties', JSON.stringify(materialProperties));
    } catch (error) {
      console.error("Failed to save data to localStorage", error);
    }
  }, [prices, materialProperties]);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  const handleCalculate = (data: ProjectInputs) => {
    const fullDimensions = {
      ...data,
      color: data.color as AluminumColor,
    };
    setLastCalculationInputs(data);
    setSelectedSupplier(data.supplier);
    setInventory(calculateInventory(fullDimensions, prices, materialProperties));
    setWindowCount(data.windows.length);
    setCalculatedWindows(data.windows);
    setClientName(data.clientName);
    
    setManualPricePerSqFt(null);
    setDeliveryFee('');
    setTaxPercentage('');
    
    setIsCalculated(true);
  };

  const handleSaveSettings = (newPrices: PriceList, newProperties: MaterialPropertiesList) => {
    setPrices(newPrices);
    setMaterialProperties(newProperties);
    // Modal remains open as per user request
    showNotification("Prices and properties saved.");
  };

  const loadProjectData = (project: SavedProject) => {
      setInventory(project.result);
      setWindowCount(project.inputs.windows.length);
      setCalculatedWindows(project.inputs.windows);
      setSelectedSupplier(project.inputs.supplier);
      setClientName(project.inputs.clientName);
      setLastCalculationInputs(project.inputs);
      
      setDeliveryFee(project.deliveryFee ?? '');
      setTaxPercentage(project.taxRate ?? '');
      setDealPercentage(project.markup ?? 60);
      setManualPricePerSqFt(project.manualPricePerSqFt ?? null);
      
      setIsCalculated(true);
      setProjectToLoad(project.inputs);
  };

  const handleProjectLoaded = () => {
      setProjectToLoad(null);
  };

  const handleExportProject = () => {
    if (!inventory || !lastCalculationInputs) {
      showNotification("Error: No calculated project to export.");
      return;
    }
    
    const projectData: SavedProject = {
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        clientName: clientName,
        inputs: lastCalculationInputs,
        result: inventory,
        deliveryFee,
        taxRate: taxPercentage,
        markup: dealPercentage,
        manualPricePerSqFt,
    };

    const dataStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `Project - ${clientName || 'Unnamed'}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification("Project exported with settings.");
    setIsToolsModalOpen(false);
  };

  const handleImportProject = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const result = event.target?.result;
                if (typeof result !== 'string') throw new Error("File could not be read.");
                const project = JSON.parse(result) as SavedProject;

                if (project && project.inputs && project.result) {
                    loadProjectData(project);
                    showNotification(`Project "${project.clientName}" loaded successfully.`);
                    setIsToolsModalOpen(false);
                } else {
                    throw new Error("Invalid project file format.");
                }
            } catch (error) {
                console.error("Failed to import project:", error);
                showNotification("Error: Could not import the project file.");
            }
        };
        reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-4">
            <div className="p-3 bg-white rounded-xl shadow-md">
                <WindowIcon className="h-10 w-10 text-sky-600" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              798 Series Inventory
            </h1>
          </div>
          <p className="mt-3 text-lg text-slate-500 max-w-2xl mx-auto">
            Calculate materials, glass, and hardware for your sliding window projects instantly.
          </p>
        </header>

        <main className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          <div className="xl:col-span-4">
            <InventoryForm 
              onCalculate={handleCalculate} 
              onManageClick={() => setIsToolsModalOpen(true)}
              projectToLoad={projectToLoad}
              onProjectLoaded={handleProjectLoaded}
              clientName={clientName}
              setClientName={setClientName}
            />
          </div>
          <div className="xl:col-span-8">
            <InventoryDisplay
              inventory={inventory}
              isCalculated={isCalculated}
              windowCount={windowCount}
              selectedSupplier={selectedSupplier}
              windows={calculatedWindows}
              clientName={clientName}
              aluminumColor={lastCalculationInputs?.color || ''}
              glassType={lastCalculationInputs?.glassType || ''}
              windowSeries={lastCalculationInputs?.windowSeries || WindowSeriesEnum._798}
              windowType={lastCalculationInputs?.windowType || WindowType.Sliding}
              isTubularFraming={lastCalculationInputs?.isTubularFraming || false}
              fixedFrameProfile={lastCalculationInputs?.fixedFrameProfile}
              prices={prices}
              materialProperties={materialProperties}
              // Lifted calculation props
              dealPercentage={dealPercentage}
              setDealPercentage={setDealPercentage}
              deliveryFee={deliveryFee}
              setDeliveryFee={setDeliveryFee}
              taxPercentage={taxPercentage}
              setTaxPercentage={setTaxPercentage}
              manualPricePerSqFt={manualPricePerSqFt}
              setManualPricePerSqFt={setManualPricePerSqFt}
            />
          </div>
        </main>

        <footer className="text-center mt-16 text-slate-400 pb-8">
          <p className="font-medium">Built by a world-class senior frontend React engineer.</p>
           <div className="flex items-center justify-center gap-6 mt-4">
              <a
                href="https://github.com/your-repo" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-2 hover:text-sky-600 transition-colors"
              >
                <GithubIcon className="h-5 w-5" />
                View Source Code
              </a>
           </div>
        </footer>

        <PriceEditor
          isOpen={isPriceEditorOpen}
          onClose={() => setIsPriceEditorOpen(false)}
          currentPrices={prices}
          currentMaterialProperties={materialProperties}
          onSave={handleSaveSettings}
        />
        
        <ToolsModal
            isOpen={isToolsModalOpen}
            onClose={() => setIsToolsModalOpen(false)}
            onManagePrices={() => {
                setIsToolsModalOpen(false);
                setIsPriceEditorOpen(true);
            }}
            onExport={handleExportProject}
            onImport={handleImportProject}
            onOpenClientPricing={() => {
              setIsToolsModalOpen(false);
              setIsClientPricingModalOpen(true);
            }}
        />

        <ClientPricingModal 
            isOpen={isClientPricingModalOpen}
            onClose={() => setIsClientPricingModalOpen(false)}
            prices={prices}
            materialProperties={materialProperties}
        />

        {notification && (
            <div className="fixed bottom-5 right-5 bg-sky-600 text-white py-3 px-6 rounded-lg shadow-xl animate-fade-in-up z-50 font-semibold">
                {notification}
            </div>
        )}
      </div>
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
