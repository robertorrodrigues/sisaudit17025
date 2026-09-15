import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

const initialSettings = {
  general: {
    companyName: '',
    cnpj: '',
    address: '',
    email: '',
    telefone: '',
    contato: '',
    logo: '',
  },
  users: [
    { id: 1, name: 'Admin Mestre', email: 'admin@sigas.com', role: 'administrador' },
    { id: 2, name: 'Técnico Zé', email: 'tecnico.ze@sigas.com', role: 'tecnico' },
    { id: 3, name: 'Atendente Ana', email: 'atendente.ana@sigas.com', role: 'atendente' },
  ],
  normas: [
    { id: 1, name: 'Norma 48', description: 'Inspeção residencial padrão.' },
    { id: 2, name: 'Norma 113', description: 'Inspeção para edifícios coletivos.' },
  ],
  security: {
    mfa: false,
    retentionPolicy: 6,
  },
  backup: {
    frequency: 'daily',
    storage: 'cloud',
  },
  notifications: {
    emailTemplate: 'Olá {cliente}, sua inspeção foi agendada para {data}.',
    smsTemplate: 'SIGas: Inspeção agendada para {data}.',
  },
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const localData = localStorage.getItem('sigas-settings');
      return localData ? JSON.parse(localData) : initialSettings;
    } catch (error) {
      return initialSettings;
    }
  });

  useEffect(() => {
    localStorage.setItem('sigas-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (category, newValues) => {
    setSettings(prevSettings => ({
      ...prevSettings,
      [category]: newValues,
    }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);