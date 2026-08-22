/**
 * In-app update checker — native (APK) only.
 * Looks at the latest GitHub Release, compares semver with the running build,
 * downloads the APK natively (no CORS, real progress) and hands it to the
 * Android package installer.
 */
const REPO = 'Reza00gg/Abrhoste'

export const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0'

function parseVer(s) {
  const m = String(s ?? '').match(/(\d+)\.(\d+)\.(\d+)/)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
}

export function isNewer(remote, local) {
  const a = parseVer(remote)
  const b = parseVer(local)
  if (!a || !b) return false
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i]
  }
  return false
}

/** Returns { version, notes, apkUrl, apkSize } or null when up to date. */
export async function checkForUpdate() {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!res.ok) throw new Error(`release check failed: ${res.status}`)
  const rel = await res.json()

  const version = (parseVer(rel.tag_name) ?? parseVer(rel.name) ?? []).join('.')
  if (!version || !isNewer(version, CURRENT_VERSION)) return null

  const apk = (rel.assets ?? []).find((a) => a.name?.endsWith('.apk'))
  if (!apk) return null

  return {
    version,
    notes: rel.body ?? '',
    apkUrl: apk.browser_download_url,
    apkSize: apk.size ?? 0,
  }
}

/**
 * Download the APK natively with progress. Returns the local file path.
 * onProgress receives 0..1. Installation is a separate, user-triggered step.
 */
export async function downloadUpdate(apkUrl, onProgress) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem')

  const listener = await Filesystem.addListener('progress', (p) => {
    if (p.contentLength > 0) onProgress(Math.min(1, p.bytes / p.contentLength))
  })

  try {
    const { path } = await Filesystem.downloadFile({
      url: apkUrl,
      path: 'lenumoviz-update.apk',
      directory: Directory.Cache,
      progress: true,
    })
    onProgress(1)
    return path
  } finally {
    listener.remove()
  }
}

/** Hand the downloaded APK to Android's package installer. */
export async function installUpdate(path) {
  const { FileOpener } = await import('@capacitor-community/file-opener')
  await FileOpener.open({
    filePath: path,
    contentType: 'application/vnd.android.package-archive',
  })
}
