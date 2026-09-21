import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, Users, FileText, Shield, Database, Bell, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import ConfigTabs from '@/components/ConfigTabs';

const Configuracoes = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('tab') || 'geral';
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setActiveTab(params.get('tab') || 'geral');
  }, [location.search]);

  const params = new URLSearchParams(location.search);
  const openUserModal = params.get('novo') === 'true';

  const tabs = [
    { id: 'geral', name: 'Geral', icon: Settings },
    { id: 'usuarios', name: 'Usuários', icon: Users },
    { id: 'normas', name: 'Normas', icon: FileText },
    { id: 'seguranca', name: 'Segurança', icon: Shield },
    { id: 'certificados', name: 'Certificados', icon: Award },
    { id: 'backup', name: 'Backup', icon: Database },
    { id: 'notificacoes', name: 'Notificações', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-white">Configurações</h1>
          <p className="text-gray-300 mt-2">Gerencie configurações do sistema</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden"
      >
        <div className="flex flex-wrap border-b border-white/20">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-4 text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </div>

        <div className="p-6">
          <ConfigTabs activeTab={activeTab} openUserModal={activeTab === 'usuarios' && openUserModal} />
        </div>
      </motion.div>
    </div>
  );
};

export default Configuracoes;