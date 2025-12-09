import React, { createContext, useContext, useState } from "react";

type ModelWeightsContextValue = {
  weightMlNext: number; // 0–1, hur mycket vi litar på ML för nästa GW
  setWeightMlNext: (w: number) => void;
};

const ModelWeightsContext = createContext<ModelWeightsContextValue | undefined>(
  undefined
);

export const ModelWeightsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [weightMlNext, setWeightMlNext] = useState(0.5); // 50/50 default

  return (
    <ModelWeightsContext.Provider value={{ weightMlNext, setWeightMlNext }}>
      {children}
    </ModelWeightsContext.Provider>
  );
};

export function useModelWeights() {
  const ctx = useContext(ModelWeightsContext);
  if (!ctx) {
    throw new Error(
      "useModelWeights must be used inside a ModelWeightsProvider"
    );
  }
  return ctx;
}
