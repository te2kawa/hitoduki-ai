import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { exportData, importData } from '../db/schema';

export default function Settings() {
  const { setPassword } = useAuth();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState('');

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (newPw !== confirmPw) { setPwError('新しいパスワードが一致しません'); return; }
    if (newPw.length < 4) { setPwError('パスワードは4文字以上にしてください'); return; }
    const ok = await setPassword(oldPw, newPw);
    if (ok) {
      setPwSuccess(true);
      setOldPw(''); setNewPw(''); setConfirmPw('');
    } else {
      setPwError('現在のパスワードが違います');
    }
  }

  async function handleExport() {
    const json = await exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hitoduki-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg('');
    try {
      const text = await file.text();
      await importData(text);
      setImportMsg('✓ インポートが完了しました');
    } catch {
      setImportMsg('❌ インポートに失敗しました。ファイル形式を確認してください。');
    }
    if (fileRef.current) fileRef.current.value = '';
  }

  const fieldClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="p-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

        {/* Password change */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">🔒 パスワード変更</h2>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">現在のパスワード</label>
              <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} className={fieldClass} required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">新しいパスワード</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className={fieldClass} required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">新しいパスワード（確認）</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={fieldClass} required />
            </div>
            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            {pwSuccess && <p className="text-sm text-green-600">✓ パスワードを変更しました</p>}
            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 rounded-lg text-sm transition-colors">
              変更する
            </button>
          </form>
        </div>

        {/* Data backup */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4">💾 データバックアップ</h2>
          <p className="text-sm text-gray-500 mb-4">
            データはブラウザ（IndexedDB）に保存されています。JSONファイルとしてエクスポート・インポートできます。
          </p>

          <div className="space-y-3">
            <button
              onClick={handleExport}
              className="w-full border border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              📥 JSONでエクスポート
            </button>

            <div>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg text-sm transition-colors"
              >
                📤 JSONからインポート
              </button>
              <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
              {importMsg && <p className="text-sm mt-2 text-gray-700">{importMsg}</p>}
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-3">
            ※ インポート時は既存データにマージされます（IDが重複する場合は上書き）
          </p>
        </div>
      </div>
    </div>
  );
}
