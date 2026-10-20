import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getActiveTenantId } from './utils/license';

// แก้ปัญหาข้อ 8: ปรับ start_url ของ PWA Manifest อัตโนมัติตามรหัสสาขา
// เพื่อให้เมื่อสร้างทางลัดบนหน้าจอโทรศัพท์ (Add to Home Screen) จะเปิดเข้าลิงก์สาขาเดิม ไม่หลุดเป็นแอดมิน
try {
  if (typeof window !== 'undefined') {
    const tenant = getActiveTenantId();
    if (tenant && tenant !== 'default') {
      const dynamicStartUrl = `/?tenant=${encodeURIComponent(tenant)}`;
      const manifestObj = {
        id: dynamicStartUrl,
        name: `RepairProShop (${tenant})`,
        short_name: `RepairPro-${tenant}`,
        description: `RepairProShop ระบบบันทึกงานซ่อม สาขา ${tenant}`,
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: dynamicStartUrl,
        scope: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      };
      const stringManifest = JSON.stringify(manifestObj);
      const blob = new Blob([stringManifest], { type: 'application/json' });
      const manifestURL = URL.createObjectURL(blob);
      const existingManifestLink = document.querySelector('link[rel="manifest"]');
      if (existingManifestLink) {
        existingManifestLink.setAttribute('href', manifestURL);
      } else {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = manifestURL;
        document.head.appendChild(link);
      }
    }
  }
} catch (e) {
  console.warn('Dynamic manifest setup warning:', e);
}

createRoot(document.getElementById('root')!).render(<App />);
