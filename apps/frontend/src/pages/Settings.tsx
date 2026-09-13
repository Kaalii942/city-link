import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../utils/api.js';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import {
  Save,
  Database,
  RefreshCw,
  FolderLock,
  Lock,
  Mail,
  Coins,
  Settings as SettingIcon,
  CheckCircle2
} from 'lucide-react';

export default function Settings() {
  const queryClient = useQueryClient();
  const user = useSelector((state: RootState) => state.auth.user);

  // States
  const [currency, setCurrency] = useState('USD');
  const [taxRateDefault, setTaxRateDefault] = useState(17);
  const [backupDirectory, setBackupDirectory] = useState('./backups');

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState('localhost');
  const [smtpPort, setSmtpPort] = useState(25);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');

  // Restore State
  const [restoreFile, setRestoreFile] = useState('');
  const [restoreConfirm, setRestoreConfirm] = useState('');
  const [restoreStatus, setRestoreStatus] = useState('');

  // Queries
  const { data: settingsData, isLoading } = useQuery<any>({
    queryKey: ['settings'],
    queryFn: () => api.get('/api/settings')
  });

  useEffect(() => {
    if (settingsData?.settings) {
      const getVal = (key: string) => settingsData.settings.find((s: any) => s.key === key)?.value;
      if (getVal('currency')) setCurrency(getVal('currency'));
      if (getVal('tax_rate_default')) setTaxRateDefault(Number(getVal('tax_rate_default')));
      if (getVal('backup_directory')) setBackupDirectory(getVal('backup_directory'));
      if (getVal('smtp_host')) setSmtpHost(getVal('smtp_host'));
      if (getVal('smtp_port')) setSmtpPort(Number(getVal('smtp_port')));
      if (getVal('smtp_user')) setSmtpUser(getVal('smtp_user'));
      if (getVal('smtp_password')) setSmtpPassword(getVal('smtp_password'));
    }
  }, [settingsData]);

  const { data: backupsData } = useQuery<any>({
    queryKey: ['backups-list'],
    queryFn: () => api.get('/api/settings/backups-list')
  });

  // Mutations
  const saveSettingsMutation = useMutation({
    mutationFn: (data: any[]) => api.post('/api/settings', { settings: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      alert('System configurations saved successfully');
    },
    onError: (err: any) => alert(err.message)
  });

  const backupMutation = useMutation({
    mutationFn: () => api.post('/api/settings/backup', {}),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['backups-list'] });
      alert(`Manual backup created: ${res.fileName}`);
    },
    onError: (err: any) => alert(err.message)
  });

  const restoreMutation = useMutation({
    mutationFn: (fileName: string) => api.post('/api/settings/restore', { fileName }),
    onSuccess: () => {
      setRestoreStatus('Database successfully restored! Reconnecting to service...');
      setRestoreConfirm('');
      setRestoreFile('');
      setTimeout(() => {
        setRestoreStatus('');
        window.location.reload();
      }, 3000);
    },
    onError: (err: any) => {
      setRestoreStatus(`Restore failed: ${err.message}`);
      setTimeout(() => setRestoreStatus(''), 5000);
    }
  });

  const hasPerm = (perm: string) => {
    return user?.roles.includes('Super Admin') || user?.permissions.includes(perm);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const settingsPayload = [
      { key: 'currency', value: currency, description: 'Base currency symbol used across EIPMS' },
      { key: 'tax_rate_default', value: String(taxRateDefault), description: 'Standard General Sales Tax (GST) rate' },
      { key: 'backup_directory', value: backupDirectory, description: 'Default folder location for database backup files' },
      { key: 'smtp_host', value: smtpHost, description: 'SMTP server hostname' },
      { key: 'smtp_port', value: String(smtpPort), description: 'SMTP server port' },
      { key: 'smtp_user', value: smtpUser, description: 'SMTP authentication username' },
      { key: 'smtp_password', value: smtpPassword, description: 'SMTP authentication password' }
    ];
    saveSettingsMutation.mutate(settingsPayload);
  };

  const handleTriggerBackup = () => {
    backupMutation.mutate();
  };

  const handleTriggerRestore = () => {
    if (!restoreFile) {
      alert('Please select a backup file');
      return;
    }
    if (restoreConfirm.toLowerCase() !== 'restore') {
      alert('Please type "RESTORE" to confirm this action');
      return;
    }

    if (confirm('WARNING: Restoring the database will overwrite all current tables. Are you sure you want to proceed?')) {
      setRestoreStatus('Initiating database restore master commands...');
      restoreMutation.mutate(restoreFile);
    }
  };

  return (
    <div className="space-y-6 font-sans text-xs">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-brand-900">System Configurations</h2>
        <p className="text-sm text-corporate-muted mt-1">Configure company profiles, default tax percentages, SMTP servers, and database backup routines.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings form */}
        <div className="lg:col-span-2 bg-white border border-corporate-border rounded-lg shadow-dynamics p-6">
          <h3 className="text-sm font-semibold text-corporate-text mb-4 uppercase tracking-wider flex items-center space-x-1.5">
            <SettingIcon className="w-4 h-4 text-brand-500" />
            <span>Parameters panel</span>
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* General section */}
            <div className="space-y-4">
              <span className="font-bold text-corporate-muted uppercase text-[10px]">General Parameters</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-corporate-text flex items-center space-x-1">
                    <Coins className="w-3.5 h-3.5 text-brand-500" />
                    <span>Currency Symbol</span>
                  </label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full text-xs"
                    disabled={!hasPerm('setting:write')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-text flex items-center space-x-1">
                    <Coins className="w-3.5 h-3.5 text-brand-500" />
                    <span>Default GST (%)</span>
                  </label>
                  <input
                    type="number"
                    value={taxRateDefault}
                    onChange={(e) => setTaxRateDefault(Number(e.target.value) || 0)}
                    className="w-full text-xs"
                    disabled={!hasPerm('setting:write')}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-corporate-text flex items-center space-x-1">
                  <FolderLock className="w-3.5 h-3.5 text-brand-500" />
                  <span>Local Server Backup Directory Path</span>
                </label>
                <input
                  type="text"
                  value={backupDirectory}
                  onChange={(e) => setBackupDirectory(e.target.value)}
                  className="w-full text-xs font-mono"
                  disabled={!hasPerm('setting:write')}
                />
              </div>
            </div>

            {/* SMTP config */}
            <div className="space-y-4 pt-4 border-t border-corporate-border">
              <span className="font-bold text-corporate-muted uppercase text-[10px]">SMTP Client Configs</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-corporate-text flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-brand-500" />
                    <span>Hostname</span>
                  </label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full text-xs"
                    disabled={!hasPerm('setting:write')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-text flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-brand-500" />
                    <span>Port</span>
                  </label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value) || 25)}
                    className="w-full text-xs"
                    disabled={!hasPerm('setting:write')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-text">Auth User</label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full text-xs"
                    disabled={!hasPerm('setting:write')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-corporate-text">Auth Password</label>
                  <input
                    type="password"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    className="w-full text-xs"
                    disabled={!hasPerm('setting:write')}
                  />
                </div>
              </div>
            </div>

            {hasPerm('setting:write') && (
              <div className="flex justify-end pt-4 border-t border-corporate-border">
                <button
                  type="submit"
                  disabled={saveSettingsMutation.isPending}
                  className="flex items-center space-x-1.5 py-1.5 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded font-semibold transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Configs</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Backup restore wizard */}
        <div className="space-y-6">
          {/* Backups trigger */}
          <div className="bg-white border border-corporate-border rounded-lg shadow-dynamics p-6 space-y-4">
            <h3 className="text-sm font-semibold text-corporate-text uppercase tracking-wider flex items-center space-x-1.5">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Database Backups</span>
            </h3>
            
            <p className="text-[10px] text-corporate-muted leading-relaxed">Manual SQL Server full backup creates a compressed file containing complete database states inside backup directories.</p>

            {hasPerm('setting:backup') && (
              <button
                type="button"
                onClick={handleTriggerBackup}
                disabled={backupMutation.isPending}
                className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${backupMutation.isPending ? 'animate-spin' : ''}`} />
                <span>Create Manual Backup</span>
              </button>
            )}
          </div>

          {/* Database restore wizard */}
          {hasPerm('setting:restore') && (
            <div className="bg-white border border-corporate-border rounded-lg shadow-dynamics p-6 space-y-4">
              <h3 className="text-sm font-semibold text-corporate-text uppercase tracking-wider flex items-center space-x-1.5 text-red-600">
                <Lock className="w-4 h-4 text-red-600" />
                <span>Restore Database Wizard</span>
              </h3>

              <div className="space-y-3">
                {restoreStatus && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 p-2.5 rounded font-semibold text-[10px]">
                    {restoreStatus}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted block">Select Backup File</label>
                  <select
                    value={restoreFile}
                    onChange={(e) => setRestoreFile(e.target.value)}
                    className="w-full text-xs"
                  >
                    <option value="">Choose backup file...</option>
                    {backupsData?.backups?.map((b: any) => (
                      <option key={b.fileName} value={b.fileName}>
                        {b.fileName} ({Math.round(b.sizeBytes / 1024)} KB)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-corporate-muted block">Type "RESTORE" to confirm</label>
                  <input
                    type="text"
                    value={restoreConfirm}
                    onChange={(e) => setRestoreConfirm(e.target.value)}
                    className="w-full text-xs font-mono uppercase"
                    placeholder="CONFIRM WORD"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleTriggerRestore}
                  disabled={restoreMutation.isPending || !restoreFile || restoreConfirm.toLowerCase() !== 'restore'}
                  className="w-full py-1.5 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded font-bold transition-colors text-center"
                >
                  {restoreMutation.isPending ? 'Executing Restore...' : 'Restore Database Now'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
