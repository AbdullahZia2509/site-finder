import fsp from "fs/promises";
import path from "path";
import axios from "axios";
import AWS from "aws-sdk";
import Papa from "papaparse";
import "dotenv/config"; // Load environment variables from .env file

// --- CONFIGURATION ---
// The script now reads configuration from the .env file.
// Make sure you have copied .env.example to .env and filled in your details.
const { AWS_REGION, S3_BUCKET_NAME } = process.env;

const competitionCsvPath = path.join("public", "competition_data.csv");

// --- SCRIPT LOGIC ---

// Configure AWS SDK
// The SDK will automatically pick up AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
// from the environment variables loaded by dotenv.
AWS.config.update({ region: AWS_REGION });
const s3 = new AWS.S3();

/**
 * Downloads an image from a URL into a buffer.
 * @param {string} url The URL of the image to download.
 * @returns {Promise<{buffer: Buffer, contentType: string} | null>} The image buffer and content type.
 */
async function downloadImage(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000, // 10-second timeout
    });
    const contentType = response.headers["content-type"];
    return { buffer: response.data, contentType };
  } catch (error) {
    console.error(`Failed to download image: ${url}`, error.message);
    return null;
  }
}

/**
 * Uploads a buffer to S3.
 * @param {Buffer} buffer The image data buffer.
 * @param {string} originalUrl The original URL, used for naming.
 * @param {string} contentType The MIME type of the image.
 * @returns {Promise<string | null>} The URL of the uploaded file in S3.
 */
async function uploadToS3(buffer, originalUrl, contentType) {
  // Create a unique file name from the original URL's path
  const fileName = `competition-photos/${path.basename(
    new URL(originalUrl).pathname
  )}.jpg`;

  const params = {
    Bucket: S3_BUCKET_NAME,
    Key: fileName,
    Body: buffer,
    ContentType: contentType || "image/jpeg",
    ACL: "public-read", // Make the image publicly accessible
  };

  try {
    const { Location } = await s3.upload(params).promise();
    return Location;
  } catch (error) {
    console.error(`Failed to upload to S3 for URL: ${originalUrl}`, error);
    return null;
  }
}

/**
 * Main function to process the CSV file.
 */
async function processImages() {
  console.log("Starting image processing...");

  if (
    !S3_BUCKET_NAME ||
    !AWS_REGION ||
    !process.env.AWS_ACCESS_KEY_ID ||
    !process.env.AWS_SECRET_ACCESS_KEY
  ) {
    console.error(
      "ERROR: Please ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and S3_BUCKET_NAME are all set in your .env file."
    );
    return;
  }

  // Read the CSV file
  const csvText = await fsp.readFile(competitionCsvPath, "utf-8");
  const { data: rows } = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const updatedRows = [];
  let processedCount = 0;

  for (const row of rows) {
    if (row.photo && row.photo.startsWith("http")) {
      console.log(`Processing image for: ${row.name || "N/A"}`);

      const imageData = await downloadImage(row.photo);

      if (imageData) {
        const s3Url = await uploadToS3(
          imageData.buffer,
          row.photo,
          imageData.contentType
        );

        if (s3Url) {
          row.photo = s3Url;
          console.log(`  -> Successfully uploaded to: ${s3Url}`);
          processedCount++;
        }
      }
    }
    updatedRows.push(row);
  }

  // Write the updated data back to the CSV file
  const updatedCsv = Papa.unparse(updatedRows, { header: true });
  await fsp.writeFile(competitionCsvPath, updatedCsv);

  console.log(
    `\nImage processing finished. Successfully processed and uploaded ${processedCount} images.`
  );
  console.log(
    `The file '${competitionCsvPath}' has been updated with the new S3 URLs.`
  );
}

processImages().catch((error) => {
  console.error("An unexpected error occurred:", error);
});
