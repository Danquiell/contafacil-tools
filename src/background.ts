/**
 * ContaFácil Tools — Background Service Worker
 *
 * Responsável por:
 * - Monitorar intimações/notificações fiscais periodicamente
 * - Mostrar notificações push quando houver novidades
 */

export {}

const CHECK_INTERVAL_MS = 30 * 60 * 1000 // 30 minutos

async function isLicenseValid(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["licenseValid"], (result) => {
      resolve(result.licenseValid === true)
    })
  })
}

// Salva o "estado anterior" de notificações para detectar novidades
async function getStoredNotificationCount(): Promise<number> {
  return new Promise((resolve) => {
    chrome.storage.local.get(["notificationCount"], (result) => {
      resolve(result.notificationCount ?? 0)
    })
  })
}

async function setStoredNotificationCount(count: number) {
  chrome.storage.local.set({ notificationCount: count })
}

// Disparado quando a extension é instalada pela primeira vez
chrome.runtime.onInstalled.addListener(() => {
  console.log("[ContaFácil Tools] Extension instalada.")
  // Agenda verificação periódica
  chrome.alarms.create("checkNotifications", {
    periodInMinutes: 30
  })
})

// Verificação periódica via alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "checkNotifications") return

  const valid = await isLicenseValid()
  if (!valid) return

  // Abre aba do e-CAC em background para checar — a content script vai extrair os dados
  // Por enquanto, emite notificação demo (será substituído pela integração real)
  console.log("[ContaFácil Tools] Verificando notificações fiscais...")
})

// Recebe mensagens da content script com contagem de intimações
chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === "NOTIFICATION_COUNT") {
    const count: number = message.count

    getStoredNotificationCount().then(async (prev) => {
      if (count > prev) {
        const diff = count - prev
        chrome.notifications.create({
          type: "basic",
          iconUrl: "assets/icon.png",
          title: "ContaFácil Tools — Nova notificação fiscal",
          message: `${diff} nova(s) intimação(ões) ou pendência(s) detectada(s) no portal.`,
          priority: 2
        })
      }
      setStoredNotificationCount(count)
    })
  }
})
