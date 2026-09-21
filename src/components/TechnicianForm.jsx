import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

const TechnicianForm = ({ tecnico, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    email: '',
    telefone: '',
    // manter compatibilidade: singular 'especialidade' no banco, mas permitir múltiplas seleções na UI
    especialidade: '',
    specialties: [],
    area_atuacao: '',
    crea_numero: '',
    crea_uf: '',
    crea_validade: '',
    status: 'ativo',
    foto_url: null,
    foto_metadata: null,
  });

  useEffect(() => {
    if (tecnico) {
      setFormData({
        nome: tecnico.nome ?? tecnico.name ?? '',
        cpf: tecnico.cpf ?? '',
        email: tecnico.email ?? '',
        telefone: tecnico.telefone ?? tecnico.phone ?? '',
        especialidade: tecnico.especialidade ?? '',
        specialties: tecnico.especialidade ? tecnico.especialidade.split(',').map(s => s.trim()) : [],
        area_atuacao: tecnico.area_atuacao ?? tecnico.region ?? '',
        crea_numero: tecnico.crea_numero ?? '',
        crea_uf: tecnico.crea_uf ?? '',
        crea_validade: tecnico.crea_validade ?? tecnico.credentialExpiry ?? '',
        status: tecnico.status ?? 'ativo',
        foto_url: tecnico.foto_url ?? null,
        foto_metadata: tecnico.foto_metadata ?? null,
      });
    }
  }, [tecnico]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // normalizar specialties -> especialidade (string) para compatibilidade com o backend
    const payload = {
      ...formData,
      especialidade: (formData.specialties && formData.specialties.length > 0)
        ? formData.specialties.join(', ')
        : formData.especialidade || '',
      // garantir campo de data com nome esperado
      crea_validade: formData.crea_validade,
    };
    onSubmit(payload);
  };

  const [credentials, setCredentials] = useState(null);

  const specialtyOptions = ['Residencial', 'Comercial', 'Industrial'];
  const regionOptions = ['Centro', 'Zona Norte', 'Zona Sul', 'Zona Leste', 'Zona Oeste'];
  const ufOptions = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  const handleSpecialtyChange = (specialty) => {
    setFormData(prev => {
      const current = prev.specialties || [];
      const next = current.includes(specialty)
        ? current.filter(s => s !== specialty)
        : [...current, specialty];
      return { ...prev, specialties: next };
    });
  };

  const handleCredentialUpload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione uma imagem para anexar as credenciais.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
        reader.readAsDataURL(file);
      });

      const metadata = {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified,
      };

      setCredentials({ name: file.name });
      setFormData(prev => ({
        ...prev,
        foto_url: dataUrl,
        foto_metadata: metadata,
      }));
      toast({
        title: 'Credencial anexada!',
        description: `${file.name} foi anexado com sucesso.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao anexar credencial',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">{tecnico ? 'Editar Técnico' : 'Novo Técnico'}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                required
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do técnico"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                CPF
              </label>
              <input
                type="text"
                required
                name="cpf"
                value={formData.cpf}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="000.000.000-00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Telefone
              </label>
              <input
                type="tel"
                required
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                required
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Especialidades
            </label>
            <div className="flex flex-wrap gap-2">
              {specialtyOptions.map(specialty => (
                <button
                  key={specialty}
                  type="button"
                  onClick={() => handleSpecialtyChange(specialty)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    (formData.specialties || []).includes(specialty)
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {specialty}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Região de Atuação
              </label>
              <select
                name="area_atuacao"
                value={formData.area_atuacao}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-black/100 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma região</option>
                {regionOptions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Crea -Validade
              </label>
              <input
                type="date"
                name="crea_validade"
                value={formData.crea_validade}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Crea - Região (UF)
              </label>
              <select
                name="crea_uf"
                value={formData.crea_uf}
                required
                onChange={handleChange}
                className="w-full px-4 py-3 bg-black/100 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione um Estado</option>
                {ufOptions.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Crea - Número
              </label>
              <input
                type="text"
                name="crea_numero"
                value={formData.crea_numero}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">
              Upload de Credenciais
            </label>
            <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              {formData.foto_url && (
                <img
                  src={formData.foto_url}
                  alt={`Imagem de ${formData.nome || 'técnico'}`}
                  className="max-h-48 max-w-full mx-auto mb-4 rounded-lg object-contain"
                />
              )}
              <p className="text-gray-400 mb-2">
                {credentials ? credentials.name : 'Clique para anexar as credenciais'}
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleCredentialUpload}
                className="hidden"
                id="credential-upload"
              />
              <label
                htmlFor="credential-upload"
                className="cursor-pointer text-blue-400 hover:text-blue-300"
              >
                Selecionar arquivo
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            >
              {tecnico ? 'Salvar' : 'Cadastrar Técnico'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default TechnicianForm;