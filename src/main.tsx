import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppPreferencesProvider } from './context/AppPreferencesContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <AppPreferencesProvider>
    <App />
  </AppPreferencesProvider>
);
