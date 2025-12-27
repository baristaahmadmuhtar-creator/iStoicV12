
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { VaultProvider } from './contexts/VaultContext';
import { FeatureProvider } from './contexts/FeatureContext';
import { NeuralLinkProvider } from './contexts/NeuralLinkContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <FeatureProvider>
      <VaultProvider>
        <NeuralLinkProvider>
          <App />
        </NeuralLinkProvider>
      </VaultProvider>
    </FeatureProvider>
  </React.StrictMode>
);
