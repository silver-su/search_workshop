I want to design a system for a workshop that allows multiple users to enter their own MongoDB Atlas connection string, and then use predefined interactive pages in this system to present the workshop experience.

This system should include the following features:

* [Login]: Provide a text field for users to enter a secret code (string).
  * The backend system should query the secret collection in this system’s MongoDB Atlas instance to validate the user input, using the following syntax:

```javascript
db.secret.find_one({'code': user_input})
```

  * If the code exists, allow the user to enter the [Settings] page.
  * If the code does not exist, display the following error message: This secret code does not exist. Please contact your consultant.

* [Environment Setup]: Provide users with the setup flow required for the workshop environment. This section should include the following blocks and guide users through the setup in the order of [Settings] > [Data Import] > [Index Check].
  * [Settings]: Provide fields for users to enter their own environment information, including MongoDB Atlas URL and VoyageAI API Key, and a Save button.
    * When the user clicks Save, the backend system should verify whether the MongoDB Atlas connection is successful.
    * If the connection is successful, store the connection string and VoyageAI API Key in the user’s browser cookies, encoded with Base64, and guide the user to proceed to the [Data Import] section.
    * If the connection fails, display: User connection failed. Possible reasons include:
      * Incorrect connection string.
      * Incorrect password. If the password contains special characters, please URL-encode it before entering it again.
      * Atlas network settings must allow 0.0.0.0/0.
      * Please contact your consultant.

  * [Data Import]: Based on the MongoDB Atlas URL entered by the user in the [Settings] section, perform the data import process and provide a Data Import button.
    * When the user clicks the Data Import button, the backend system should Base64-decode the MongoDB Atlas URL provided by the user.
    * Based on the decoded Atlas URL, the backend system should write the contents of the project’s restaurant.json file into the user’s Atlas cluster under the workshop.restaurant collection, and show a progress bar during the import process.
    * After the import is complete, verify whether the restaurant collection contains exactly 4292 documents.
      * If the count does not match, first drop the workshop.restaurant collection, then display: Load failed. Please click the Data Import button again.
      * If the count matches, display: Load successful. Please proceed with the workshop content.

  * [Index Check]: Help users verify the following:
    * Whether the restaurant_auto_index Vector Index has been created in the workshop.restaurant collection.
    * Whether the restaurant_sindex Search Index has been created in the workshop.restaurant collection.

* [Text & Vector Search] page: This page should allow users to read the MongoDB URL and VoyageAI API Key from the [Environment Setup] page and use them to query data in the workshop.restaurant collection.
  * The web page should include the following components:
    * A field for entering the query sentence.
    * Buttons for different query methods, including:
      * Keyword Search.
      * Vector Search.
        * Use the voyage-4 model.
        * Use the voyage-4-lite model.
      * [Checkbox] Reranker: Determines whether reranking should be enabled after either of the above two search methods.
        * If checked, use the VoyageAI API Key provided in [Environment Setup] to call rerank-2.5.
    * Query results should include:
      * The original JSON document.
      * The related score.
      * For each record, apply the latitude and longitude values from the location.coordinates array to Google Maps and display the map on the right side of that JSON document.

The web frontend should be developed using Next.js (React), and the backend should be developed using Python with FastAPI.

Please provide a complete and runnable project scaffold, including the frontend (all Next.js pages/components), the backend (all FastAPI routes), configuration files, and requirements/package.json, so that the project can be started directly.

The web UI should follow MongoDB’s design style.
