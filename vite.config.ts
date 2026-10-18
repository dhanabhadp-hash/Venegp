import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

function lineProxyPlugin(): Plugin {
  return {
    name: 'line-proxy-plugin',
    configureServer(server) {
      // Configuration & secret status endpoint
      server.middlewares.use('/api/line/config', async (req, res) => {
        const hasServerSecret = Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN?.trim());
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            hasServerSecret,
            envGroupId: process.env.LINE_GROUP_ID || '',
            envUserId: process.env.LINE_USER_ID || '',
          })
        );
      });

      // Push message proxy
      server.middlewares.use('/api/line/push', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let bodyStr = '';
        req.on('data', chunk => {
          bodyStr += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(bodyStr || '{}');
            const token =
              data.channelAccessToken ||
              req.headers.authorization?.replace('Bearer ', '') ||
              process.env.LINE_CHANNEL_ACCESS_TOKEN;

            if (!token) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error:
                    'Missing LINE Channel Access Token. Please provide token or configure LINE_CHANNEL_ACCESS_TOKEN in Secrets.',
                })
              );
              return;
            }

            const target = data.to || process.env.LINE_GROUP_ID || process.env.LINE_USER_ID;
            if (!target) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing target LINE destination ID (group or user)' }));
              return;
            }

            const response = await fetch('https://api.line.me/v2/bot/message/push', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                to: target,
                messages: data.messages,
              }),
            });

            const resultText = await response.text();
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(resultText || JSON.stringify({ success: response.ok }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal proxy error' }));
          }
        });
      });

      // Broadcast message proxy
      server.middlewares.use('/api/line/broadcast', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let bodyStr = '';
        req.on('data', chunk => {
          bodyStr += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(bodyStr || '{}');
            const token =
              data.channelAccessToken ||
              req.headers.authorization?.replace('Bearer ', '') ||
              process.env.LINE_CHANNEL_ACCESS_TOKEN;

            if (!token) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error:
                    'Missing LINE Channel Access Token. Please provide token or configure LINE_CHANNEL_ACCESS_TOKEN in Secrets.',
                })
              );
              return;
            }

            const response = await fetch('https://api.line.me/v2/bot/message/broadcast', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                messages: data.messages,
              }),
            });

            const resultText = await response.text();
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(resultText || JSON.stringify({ success: response.ok }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal proxy error' }));
          }
        });
      });

      // Bot Info / Test proxy
      server.middlewares.use('/api/line/test', async (req, res) => {
        let bodyStr = '';
        req.on('data', chunk => {
          bodyStr += chunk;
        });

        req.on('end', async () => {
          try {
            const data = JSON.parse(bodyStr || '{}');
            const token =
              data.channelAccessToken ||
              req.headers.authorization?.replace('Bearer ', '') ||
              process.env.LINE_CHANNEL_ACCESS_TOKEN;

            if (!token) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error:
                    'Missing LINE Channel Access Token. Please configure LINE_CHANNEL_ACCESS_TOKEN in AI Studio Secrets or provide token.',
                })
              );
              return;
            }

            const response = await fetch('https://api.line.me/v2/bot/info', {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            const result = await response.json();
            res.statusCode = response.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(result));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal error' }));
          }
        });
      });

      // Google Sheet CSV proxy
      server.middlewares.use('/api/sheet/data', async (req, res) => {
        try {
          const defaultSheetId = '1DzH6jwgFhDiRSylIv6RYODugMpXrp_n_A0q4jfp_jZg';
          let sheetId = defaultSheetId;

          const urlObj = new URL(req.url || '', 'http://localhost:3000');
          const customUrl = urlObj.searchParams.get('url') || '';
          if (customUrl) {
            const match = customUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
            if (match && match[1]) {
              sheetId = match[1];
            } else if (customUrl.trim().length > 10) {
              sheetId = customUrl.trim();
            }
          }

          const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
          const response = await fetch(csvUrl);
          if (!response.ok) {
            throw new Error(`Google Sheet returned HTTP ${response.status}`);
          }

          const csvText = await response.text();

          const rows: string[][] = [];
          let currentRow: string[] = [];
          let currentVal = '';
          let inQuotes = false;

          for (let i = 0; i < csvText.length; i++) {
            const char = csvText[i];
            const nextChar = csvText[i + 1];
            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                currentVal += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === ',' && !inQuotes) {
              currentRow.push(currentVal.trim());
              currentVal = '';
            } else if ((char === '\r' || char === '\n') && !inQuotes) {
              if (char === '\r' && nextChar === '\n') i++;
              currentRow.push(currentVal.trim());
              if (currentRow.some(c => c.length > 0)) rows.push(currentRow);
              currentRow = [];
              currentVal = '';
            } else {
              currentVal += char;
            }
          }
          if (currentVal || currentRow.length > 0) {
            currentRow.push(currentVal.trim());
            if (currentRow.some(c => c.length > 0)) rows.push(currentRow);
          }

          let headerRowIdx = -1;
          const dayColMap: { [day: number]: number } = {};

          for (let r = 0; r < rows.length; r++) {
            const row = rows[r];
            let count = 0;
            row.forEach((cell, cIdx) => {
              const numMatch = cell.match(/^(\d{1,2})/);
              if (numMatch) {
                const d = parseInt(numMatch[1], 10);
                if (d >= 1 && d <= 31) {
                  dayColMap[d] = cIdx;
                  count++;
                }
              }
            });
            if (count >= 15) {
              headerRowIdx = r;
              break;
            }
          }

          const shifts: any[] = [];
          const staffLineMap: { [name: string]: { lineUserId: string; phone: string } } = {
            'น.ส.กนกวรรณ ศรีจันทร์': { lineUserId: 'Ua1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6', phone: '081-456-7890' },
            'นางปริยากร หล้าภู': { lineUserId: 'Ub2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7', phone: '089-123-4567' },
            'นางรุ่งนภา ถึงทุ่ง': { lineUserId: 'Uc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8', phone: '086-789-0123' },
            'นายธนาพัทธ์ ปงกา': { lineUserId: 'Ud4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9', phone: '084-567-8901' },
          };

          if (headerRowIdx !== -1) {
            for (let r = headerRowIdx + 1; r < rows.length; r++) {
              const row = rows[r];
              const name = (row[1] || '').trim();
              const role = (row[2] || '').trim();
              if (!name || name.includes('รวม') || name.includes('ผู้จัดเวร') || name.includes('ผู้ตรวจสอบ')) continue;

              const staffMeta = staffLineMap[name] || { lineUserId: '', phone: '' };

              for (let d = 1; d <= 31; d++) {
                const cIdx = dayColMap[d];
                if (cIdx !== undefined && cIdx < row.length) {
                  const val = (row[cIdx] || '').trim();
                  if (val && val !== '-' && val !== '0') {
                    const isMorning = val.includes('เช้า') || val.includes('08:30');
                    const startTime = isMorning ? '08:30' : '16:00';
                    const endTime = isMorning ? '16:30' : '20:00';
                    const dateStr = `2026-10-${String(d).padStart(2, '0')}`;

                    shifts.push({
                      id: `live-${r}-${d}`,
                      date: dateStr,
                      staffName: name,
                      shiftType: isMorning ? 'morning' : 'afternoon',
                      shiftName: val,
                      startTime,
                      endTime,
                      department: 'กลุ่มงานเภสัชกรรม รพ.สบปราบ',
                      lineUserId: staffMeta.lineUserId,
                      phone: staffMeta.phone,
                      notes: `${role} • งานเอกสารและจ่ายยา OT`,
                      status: 'confirmed',
                    });
                  }
                }
              }
            }
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: true,
              title: 'ตารางการปฏิบัติงาน โรงพยาบาลสบปราบ (ตุลาคม 2569)',
              shifts,
              count: shifts.length,
            })
          );
        } catch (err: any) {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: false,
              error: err.message,
              message: 'ไม่สามารถดึงข้อมูลแบบสดจาก Google Sheets ได้โดยตรง',
            })
          );
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), lineProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
