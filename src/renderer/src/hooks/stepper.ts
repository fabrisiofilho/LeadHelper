import { useState } from 'react';

export function useStepper(maxStep: number) {
  const [activeStep, setActiveStep] = useState(0);

  const nextStep = () => {
    setActiveStep((prevActiveStep) => {
      if (prevActiveStep === maxStep) return prevActiveStep;

      return prevActiveStep + 1;
    });
  };

  const previousStep = () => {
    setActiveStep((prevActiveStep) => {
      if (prevActiveStep === 0) return prevActiveStep;

      return prevActiveStep - 1;
    });
  };

  return { activeStep, nextStep, previousStep };
}
