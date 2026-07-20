export async function convertBlobUrltoFile(blobUrl: string) {
    try {
        const response = await fetch(blobUrl);
        const blob = await response.blob();
        const fileName = Math.random().toString(36).substring(2, 12);
        const mimeType = blob.type || "application/octet-stream";
        const file = new File([blob], fileName, { type: mimeType })
        return file;
    } catch (error) {
        console.error("Error converting blob URL to file:", error);
        return null;
    }
}