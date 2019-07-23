const fs = require('fs');
const { google } = require('googleapis');
const readline = require('readline');
var oauth2Client = new google.auth.OAuth2();

/**
 * TODO: Replace these global variables
 * appropriately.
 */
var INPUT_IMAGE_ID = 'YOUR_IMAGE_ID';
var AUTH_TOKEN = 'YOUR_AUTHENTICATION_TOKEN';
var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';

/**
 * HTTP Cloud Function that obtains image file ID &
 * authentication from client & makes calls to 
 * helper functions.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
exports.analyzeImage = async (req, res) => {
  handleCors(req, res);
    
  // Make a call to helper function.
  getLabels(INPUT_IMAGE_ID, AUTH_TOKEN).then(url => {
    console.log("Returning URL to client: " + url); 
    res.status(200).type('text/json')
      .end(JSON.stringify(url));
  }).catch(err => {
    console.log("Error: " + err);
    res.status(500).end();
  })
};

/**
 * Creates a bar chart with given Sheet's data.
 *
 * @param {String} authToken Authentication to access user's sheet.
 */
function createChart(authToken) {  
  oauth2Client.setCredentials({
   access_token: authToken
  });
    
  // Create sheets client.
  const sheet = google.sheets({version: 'v4', 
                              auth: oauth2Client
                             });  
 
  // JSON request body.
  var chartRequest = { 
       requests: [
        {
          addChart: {
            chart: {
              spec: {
                title: "Vision API Data",
                basicChart: {
                  chartType: "COLUMN",
                  legendPosition: "BOTTOM_LEGEND",
                  axis: [
                    {
                      position: "BOTTOM_AXIS",
                      title: "Vision Labels"
                    },
                    {
                      position: "LEFT_AXIS",
                      title: "Score" 
                    }
                  ],
                  domains: [
                    {
                      domain: {
                        sourceRange: {
                          sources: [
                            {
                              startRowIndex: 0,
                              endRowIndex: 5,
                              startColumnIndex: 0,
                              endColumnIndex: 1
                            }
                          ]
                        }
                      }
                    }
                  ], // closes domains
                  series: [
                    {
                      series: {
                        sourceRange: {
                          sources: [
                            {
                              startRowIndex: 0,
                              endRowIndex: 7,
                              startColumnIndex: 1,
                              endColumnIndex: 2
                            }
                          ]
                        }
                      }, // closes first Series
                      targetAxis: "LEFT_AXIS"
                    } // closes series item
                  ],
                  headerCount: 1
                } // closes basicChart
              }, // closes spec
              position: {
                newSheet: true
              } 
            } 
          } 
        } 
      ] 
  } 

  // Pushes request to sheet.
  sheet.spreadsheets.batchUpdate({
      SPREADSHEET_ID,
      resource: chartRequest,
    }, (err, response) => {
      if (err) {
        console.log(err);
      }
      console.log("CreatingChart response is: " + JSON.stringify(response, null, 2));
    });
  
}

/**
 * Writes label detection data to the newly created sheet.
 * 
 * @param {data} labels Labels returned from Vision API.
 * @param {data} labelScores Label Scores returned from Vision API.
 * @param {String} authToken Authentication to write to user's sheet.
 */
function writeToSheet(labels, labelScores, authToken) {
  // Create oauth2Client instance.
  oauth2Client.setCredentials({
   access_token: authToken
  });
    
  // Create sheets instance.
  const sheet = google.sheets({version: 'v4', 
                              auth: oauth2Client
                             });
    
  // Arrange labels data to insert to sheet.
  var dataString = JSON.stringify(labels, null, 2);
  dataString = dataString.replace(/[\[\]'\"]+/g,'');
  dataString = dataString.split(',');
  var dataLength = dataString.length;
  
  // Arrange label scores to insert to sheet.
  var labelString = JSON.stringify(labelScores, null, 2);
  labelString = labelString.replace(/[\[\]'\"]+/g,'');
  labelString = labelString.split(',');

  // Print image labels to sheet.
  var values = []
  for (var i = 0; i < dataLength; i++) {
    var dataToPush = [dataString[i], labelString[i]];
    values.push(dataToPush);
  }
        
  // Instance of valueRange.
  var body = {
	values: values
  }
  
  var request = {
    spreadsheetId: SPREADSHEET_ID,
    valueInputOption: 'USER_ENTERED',
    range: 'A1:B',
    resource: body,
    auth: oauth2Client
    // majorDimension = ROWS by default.
  };
    
  // Update sheet with data.
  sheet.spreadsheets.values.update(request, {
  }).then(function(res) {
     console.log("Values updated! Response is: " + JSON.stringify(res, null, 2));
     createChart(SPREADSHEET_ID, authToken);
  }).catch(function(err) {
    console.log("update values err: " + err);
  });
}

/** 
 * Gets label detection information from Vision API.
 *
 * @param {String} imageUrl fileID of a Google Drive image.
 *    Make sure the fileID is of a publicly accessible image!
 * @param {String} authToken Authorization to create Sheet with
 * obtained Vision API data.
 */
async function getLabels(imageUrl, authToken) {  
  // Imports the Google Cloud client library
  const vision = require('@google-cloud/vision');
  // Creates a client
  const client = new vision.ImageAnnotatorClient();
  //console.log("created client");
 
   const imgFileBytes = await getFileBytes(imageUrl);
   const [result] = await client.labelDetection({image: {content: imgFileBytes}});
   var labelsResult = result.labelAnnotations;
   var labels = labelsResult.map(label => label.description);
   var labelScores = labelsResult.map(label => label.score);
  
   // Returns created sheet's URL.
   return await writeToSheet(labels, labelScores, authToken);                         
}

/** 
 * Takes Drive fileID and obtains file bytes.
 *
 * @param {String} fileID ID of image Drive file to access.
 */
async function getFileBytes(fileId) {
  let auth = await google.auth.getClient({ 
    scopes: ['https://www.googleapis.com/auth/drive']
  });
  
  let drive = google.drive({version: 'v3', auth});
  let response = await drive.files.get({
    fileId: fileId,
    alt: 'media'
  }, {
    responseType: 'arraybuffer'
  });
  return Buffer.from(response.data); 
}

/**
 * HTTP function that supports CORS requests.
 *
 * @param {Object} req Cloud Function request context.
 * @param {Object} res Cloud Function response context.
 */
handleCors = (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Max-Age", "3600");
  if (req.method == 'OPTIONS') {
    res.status(204).send('');
  }
}
