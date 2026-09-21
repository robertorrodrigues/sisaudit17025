import React from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Calendar, Star, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const TechnicianList = ({ searchTerm, filterStatus }) => {
  const technicians = [
    {
      id: 1,
      name: 'João Silva',
      cpf: '123.456.789-00',
      phone: '(11) 99999-9999',
      email: 'joao.silva@email.com',
      specialties: ['Residencial', 'Comercial'],
      status: 'ativo',
      rating: 4.8,
      totalInspections: 156,
      credentialExpiry: '2024-12-15',
      region: 'Zona Norte'
    },
    {
      id: 2,
      name: 'Maria Santos',
      cpf: '987.654.321-00',
      phone: '(11) 88888-8888',
      email: 'maria.santos@email.com',
      specialties: ['Comercial', 'Industrial'],
      status: 'ativo',
      rating: 4.9,
      totalInspections: 203,
      credentialExpiry: '2025-03-20',
      region: 'Zona Sul'
    },
    {
      id: 3,
      name: 'Carlos Lima',
      cpf: '456.789.123-00',
      phone: '(11) 77777-7777',
      email: 'carlos.lima@email.com',
      specialties: ['Residencial'],
      status: 'ativo',
      rating: 4.7,
      totalInspections: 89,
      credentialExpiry: '2024-02-10',
      region: 'Centro'
    },
    {
      id: 4,
      name: 'Ana Costa',
      cpf: '321.654.987-00',
      phone: '(11) 66666-6666',
      email: 'ana.costa@email.com',
      specialties: ['Industrial'],
      status: 'credencial_vencendo',
      rating: 4.6,
      totalInspections: 134,
      credentialExpiry: '2024-01-25',
      region: 'Zona Oeste'
    }
  ];

  const getStatusColor = (status) => {
    const colors = {
      ativo: 'bg-green-500/20 text-green-300',
      inativo: 'bg-red-500/20 text-red-300',
      credencial_vencendo: 'bg-orange-500/20 text-orange-300'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-300';
  };

  const isCredentialExpiring = (expiryDate) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  const filteredTechnicians = technicians.filter(technician => {
    const matchesSearch = searchTerm === '' || 
      technician.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      technician.cpf.includes(searchTerm) ||
      technician.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'todos' || technician.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewTechnician = (technician) => {
    toast({
      title: "🚧 Esta funcionalidade não está implementada ainda—mas não se preocupe! Você pode solicitá-la no seu próximo prompt! 🚀"
    });
  };

  const handleEditTechnician = (technician) => {
    toast({
      title: "🚧 Esta funcionalidade não está implementada ainda—mas não se preocupe! Você pode solicitá-la no seu próximo prompt! 🚀"
    });
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
      <div className="p-6 border-b border-white/20">
        <h3 className="text-xl font-semibold text-white">
          Técnicos ({filteredTechnicians.length})
        </h3>
      </div>

      <div className="divide-y divide-white/10">
        {filteredTechnicians.map((technician, index) => (
          <motion.div
            key={technician.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-6 hover:bg-white/5 transition-colors duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                {/* Avatar */}
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-lg">
                    {technician.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-white font-semibold text-lg">{technician.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(technician.status)}`}>
                      {technician.status.replace('_', ' ').toUpperCase()}
                    </span>
                    {isCredentialExpiring(technician.credentialExpiry) && (
                      <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300">
                        CREDENCIAL VENCENDO
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-300">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        {technician.phone}
                      </div>
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2" />
                        {technician.email}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {technician.region}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2" />
                        Credencial: {new Date(technician.credentialExpiry).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Star className="w-4 h-4 mr-2 text-yellow-400" />
                        {technician.rating} ({technician.totalInspections} inspeções)
                      </div>
                      <div>
                        <span className="text-gray-400">Especialidades: </span>
                        {technician.specialties.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  onClick={() => handleViewTechnician(technician)}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => handleEditTechnician(technician)}
                  variant="outline"
                  size="sm"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredTechnicians.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-gray-400">Nenhum técnico encontrado com os filtros aplicados.</p>
        </div>
      )}
    </div>
  );
};

export default TechnicianList;