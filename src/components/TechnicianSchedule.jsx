import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const TechnicianSchedule = ({ osList = [], selectedDate }) => {
  if (!selectedDate) return null;

  const selectedDay = formatDate(selectedDate);

  // ✅ Filtra OS do dia
  const osDoDia = osList.filter(os => os.data === selectedDay);

  // ✅ Agrupa por técnico
  const porTecnico = osDoDia.reduce((acc, os) => {
    const nomeTecnico = os.tecnico?.nome || 'Sem técnico';

    if (!acc[nomeTecnico]) {
      acc[nomeTecnico] = [];
    }

    acc[nomeTecnico].push(os);
    return acc;
  }, {});

  const getStatusColor = (status) => {
    const colors = {
      pendente: 'bg-red-400/20 text-red-300',
      em_progresso: 'bg-purple-500/20 text-purple-300',
      concluido: 'bg-green-500/20 text-green-300',
      cancelada: 'bg-orange-500/20 text-orange-300',
      encerrado: 'bg-red-500/20 text-green-300',
      nao_conforme: 'bg-red-500/20 text-red-300',
    };
    return colors[status] ?? 'bg-gray-500/20 text-gray-300';
  };

  return (
    <div className="space-y-6">
      {Object.keys(porTecnico).length === 0 && (
        <p className="text-gray-400">Nenhuma OS agendada para esta data.</p>
      )}

      {Object.entries(porTecnico).map(([tecnico, lista], index) => (
        <motion.div
          key={tecnico}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-white/20"
        >
          {/* Técnico */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold">
                  {tecnico.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{tecnico}</h3>
                <p className="text-sm text-gray-300">
                  {lista.length} OS no dia
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <MapPin className="w-4 h-4 mr-1" />
              Rota
            </Button>
          </div>

          {/* OS do técnico */}
          <div className="space-y-3">
            {lista.map(os => (
              <div
                key={os.id}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-blue-400 font-medium">{os.numero}</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${getStatusColor(
                      os.status
                    )}`}
                  >
                    {os.status}
                  </span>
                </div>

                <div className="text-sm text-gray-300 flex items-center mt-2">
                  <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                  {os.endereco} - {os.cidade}
                </div>
                <div className="text-sm text-gray-300 flex items-center mt-2">
                  <User className="w-4 h-4 mr-2" />
                  {os.cliente}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default TechnicianSchedule;