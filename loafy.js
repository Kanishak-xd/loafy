const axios = require('axios');
const cheerio = require('cheerio');
const opn = require('opn');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create an interface for reading user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to fetch lyrics from Genius
async function fetchLyrics(songName, artistName) {
  try {
    // Search for the song on Genius
    const searchUrl = `https://genius.com/api/search/multi?q=${encodeURIComponent(
      `${songName} ${artistName}`
    )}`;
    const searchResponse = await axios.get(searchUrl);
    const searchData = searchResponse.data;

    // Find the first song result
    const songResult = searchData.response.sections
      .find((section) => section.type === 'song')
      ?.hits[0]?.result;

    if (!songResult) {
      throw new Error('Song not found on Genius.');
    }

    // Fetch the lyrics page
    const lyricsUrl = songResult.url;
    const lyricsPageResponse = await axios.get(lyricsUrl);
    const $ = cheerio.load(lyricsPageResponse.data);

    // Extract lyrics from the page
    const lyricsContainer = $('[data-lyrics-container="true"]');
    let lyrics = '';

    // Preserve line breaks and formatting
    lyricsContainer.each((i, el) => {
      const html = $(el).html(); // Get the inner HTML
      const formattedText = html
        .replace(/<br>/g, '\n') // Replace <br> tags with newlines
        .replace(/<.*?>/g, ''); // Remove all other HTML tags
      lyrics += formattedText + '\n\n'; // Add double newlines for spacing
    });

    if (!lyrics.trim()) {
      throw new Error('Lyrics not found on the page.');
    }

    return lyrics.trim(); // Remove extra whitespace
  } catch (error) {
    throw new Error(`Failed to fetch lyrics: ${error.message}`);
  }
}

// Function to create an HTML file with the lyrics
function createLyricsHTML(lyrics, songName, artistName) {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Lyrics: ${songName} - ${artistName}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #1e1e1e;
          color: #ffffff;
          margin: 0;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        #lyrics {
          white-space: pre-wrap;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <h1>${songName} - ${artistName}</h1>
      <div id="lyrics">${lyrics}</div>
    </body>
    </html>
  `;

  const filePath = path.join(__dirname, 'lyrics.html');
  fs.writeFileSync(filePath, htmlContent);
  return filePath;
}

// Main function
async function main() {
  try {
    // Ask the user for song and artist name
    rl.question('Enter the song name: ', async (songName) => {
      rl.question('Enter the artist name: ', async (artistName) => {
        // Fetch lyrics
        const lyrics = await fetchLyrics(songName, artistName);

        // Create an HTML file with the lyrics
        const filePath = createLyricsHTML(lyrics, songName, artistName);

        // Open the HTML file in the default browser
        opn(filePath);

        // Close the readline interface
        rl.close();
      });
    });
  } catch (error) {
    console.error(error.message);
    rl.close();
  }
}

// Run the program
main();

module.exports = { fetchLyrics };