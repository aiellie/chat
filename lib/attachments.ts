import type { FileUIPart } from "ai"

// Sent with their own type. Anything else that reads as text goes as plain
// text, and the rest (audio, archives, binaries) is left out.
const SENT_AS_IS = /^(image\/(png|jpeg|gif|webp)|application\/pdf)$/

// What a picked folder brings along that nobody means to send.
const SKIPPED_IN_FOLDER = /(^|\/)(\.[^/]*|node_modules)(\/|$)/

/** The file's path inside a picked folder, or just its name. */
function pathOf(file: File) {
  return file.webkitRelativePath || file.name
}

async function readsAsText(file: File) {
  const head = new Uint8Array(await file.slice(0, 8192).arrayBuffer())
  return !head.includes(0)
}

/** Keeps the files a model can read: pictures, PDFs and text. */
async function readableFiles(files: File[]) {
  const kept = await Promise.all(
    files.map(async (file) => {
      if (
        file.webkitRelativePath &&
        SKIPPED_IN_FOLDER.test(file.webkitRelativePath)
      )
        return null
      if (SENT_AS_IS.test(file.type) || (await readsAsText(file))) return file
      return null
    })
  )
  return kept.filter((file): file is File => file !== null)
}

function mediaTypeOf(file: File) {
  return SENT_AS_IS.test(file.type) ? file.type : "text/plain"
}

function toDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function toFileParts(files: File[]): Promise<FileUIPart[]> {
  return Promise.all(
    files.map(async (file) => {
      const mediaType = mediaTypeOf(file)
      return {
        type: "file" as const,
        mediaType,
        filename: pathOf(file),
        url: await toDataUrl(new Blob([file], { type: mediaType })),
      }
    })
  )
}

export { mediaTypeOf, pathOf, readableFiles, toFileParts }
