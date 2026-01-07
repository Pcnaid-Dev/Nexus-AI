
import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Check } from 'lucide-react';

interface OnboardingTourProps {
  onComplete: () => void;
}

const TOUR_STEPS = [
  {
    title: "Welcome to Nexus",
    description: "Your AI-powered collaborative workspace. Let's take a quick tour.",
    target: "body", // Global
    position: "center"
  },
  {
    title: "Navigation",
    description: "Switch between Team Chat, Projects, Calendar, and Knowledge Base here.",
    target: "nav", // Target the Sidebar nav
    position: "right"
  },
  {
    title: "AI & Chat",
    description: "Chat with customized AI Personas. Use 'Live Voice' or 'Camera' for multimodal interaction.",
    target: "#chat-header",
    position: "bottom"
  },
  {
    title: "Agent Settings",
    description: "Customize your AI agents' personalities, tones, and even their color themes here.",
    target: "button[title='Agents & Settings']", // Approximation
    position: "right"
  }
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    // Check if user has seen tour
    const hasSeen = localStorage.getItem('nexus_tour_complete');
    if (!hasSeen) {
      setIsVisible(true);
    } else {
        onComplete();
    }
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const step = TOUR_STEPS[currentStep];
    
    if (step.target === 'body') {
        setPosition({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 150 });
        return;
    }

    // Try to find element
    const el = document.querySelector(step.target);
    if (el) {
        const rect = el.getBoundingClientRect();
        let top = rect.top;
        let left = rect.left;

        if (step.position === 'right') {
            left += rect.width + 20;
            top += rect.height / 2 - 50;
        } else if (step.position === 'bottom') {
            top += rect.height + 20;
            left += rect.width / 2 - 150;
        } else if (step.position === 'center') {
            top = window.innerHeight / 2 - 100;
            left = window.innerWidth / 2 - 150;
        }

        setPosition({ top, left });
    } else {
        // Fallback if element not found (e.g., view changed)
        setPosition({ top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 150 });
    }

  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    localStorage.setItem('nexus_tour_complete', 'true');
    setIsVisible(false);
    onComplete();
  };

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[1000] pointer-events-none">
      {/* Dimmed Background */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] pointer-events-auto" />
      
      {/* Tooltip Card */}
      <div 
        className="absolute bg-white p-6 rounded-2xl shadow-2xl w-80 pointer-events-auto transition-all duration-500 ease-in-out border border-blue-100"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
      >
        <button onClick={finishTour} className="absolute top-2 right-2 text-slate-300 hover:text-slate-500">
            <X className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2 mb-3">
            <div className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-1 rounded-md">
                Step {currentStep + 1}/{TOUR_STEPS.length}
            </div>
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-2">{step.title}</h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {step.description}
        </p>

        <div className="flex justify-between items-center">
            <div className="flex space-x-1">
                {TOUR_STEPS.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-blue-500' : 'w-1.5 bg-slate-200'}`} />
                ))}
            </div>
            <button 
                onClick={handleNext}
                className="flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 shadow-lg"
            >
                {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
                {currentStep === TOUR_STEPS.length - 1 ? <Check className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 ml-2" />}
            </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
