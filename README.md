# Using Google Cloud Functions & the Sheets API to visualize data.

_Send an image through the Vision API & send its data to a Google Sheet
to generate a chart of the data._

Last updated: July, 2019

[Google Cloud Functions][g-c-f] is a great tool to make calls to Google's many APIs.
In this case, we will be using the [Vision API][vision-api] to obtain an image's data, and
the [Sheets API][sheets-api] to send this data to a Spreadsheet & generate a chart.

[g-c-f]: https://cloud.google.com/functions
[vision-api]: https://cloud.google.com/vision
[sheets-api]: https://developers.google.com/sheets/api/

## Technology highlights

- The GCF makes a call to the Vision API to obtain label detection data.
- The GCF makes a call to the Sheets API to input the obtained data into a
  Google Sheet in proper format.
- The GCF makes a call to the Sheets API to create a column chart based on
  the sheet's existing data. 


## Learn more

You can take a look at my corresponding [blog post][blog-post] where I discuss
this code, its use cases, and its overall purpose.

[blog-post]: /** BLOG POST LINK **/
