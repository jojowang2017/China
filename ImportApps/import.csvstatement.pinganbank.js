// Copyright [2016] [Banana.ch SA - Lugano Switzerland]
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// @id = ch.banana.apps.import.csvstatement.pinganbank
// @api = 1.0
// @pubdate = 2016-04-06
// @publisher = Banana.ch SA
// @description = PingAnBank.csv 平安银行
// @task = import.transactions
// @doctype = 100.*; 110.*; 130.*
// @docproperties = 
// @outputformat = transactions.simple
// @inputdatasource = openfiledialog
// @timeout = -1
// @inputfilefilter = Text files (*.txt *.csv);;All files (*.*)
// @inputencoding=GBK


//Main function
function exec(inData) {
	
	//1. Function call to define the conversion parameters
	var convertionParam = defineConversionParam();

	//2. we can eventually process the input text
	inData = preProcessInData(inData);
//Banana.Ui.showText(JSON.stringify(inData));

	//3. intermediaryData is an array of objects where the property is the banana column name
   var intermediaryData = convertToIntermediaryData(inData, convertionParam);
	//Banana.Ui.showText(JSON.stringify(intermediaryData));
	//4. translate categories and Description 
	// can define as much postProcessIntermediaryData function as needed
	postProcessIntermediaryData(intermediaryData);

   //5. sort data
   intermediaryData = sortData(intermediaryData, convertionParam);

   //TO DEBUG SHOW THE INTERMEDIARY TEXT
//Banana.Ui.showText(JSON.stringify(intermediaryData));
   
   //6. convert to banana format
	//column that start with "_" are not converted
	var text =  convertToBananaFormat(intermediaryData);	
	
   //TO DEBUG SHOW THE INTERMEDIARY TEXT
   //Banana.Ui.showText(text);
	
   return text;
}


//The purpose of this function is to let the users define:
// - the parameters for the conversion of the CSV file;
// - the fields of the csv/table
function defineConversionParam() {

	var convertionParam = {};

	/** SPECIFY THE SEPARATOR AND THE TEXT DELIMITER USED IN THE CSV FILE */
   convertionParam.format = "csv"; // available formats are "csv", "html"
   convertionParam.separator = ',';
   convertionParam.textDelim = '"';

	/** SPECIFY AT WHICH ROW OF THE CSV FILE IS THE HEADER (COLUMN TITLES)
	We suppose the data will always begin right away after the header line */
	convertionParam.headerLineStart = 0;
	convertionParam.dataLineStart = 1;

	/** IN CASE THERE IS NO HEADER 
	*   include the end of line */
	//convertionParam.header = "Date,Income,_None,Description,_Description2\n";

   /** SPECIFY THE COLUMN TO USE FOR SORTING
   If sortColums is empty the data are not sorted */
   convertionParam.sortColums = ["Date", "ExternalReference"];
   convertionParam.sortDescending = false;
	/** END */

	/* rowConvert is a function that convert the inputRow (passed as parameter)
	*  to a convertedRow object 
	* - inputRow is an object where the properties is the column name found in the CSV file
	* - convertedRow is an  object where the properties are the column name to be exported in Banana 
	* For each column that you need to export in Banana create a line that create convertedRow column 
	* The right part can be any fuction or value 
	* Remember that in Banana
	* - Date must be in the format "yyyy-mm-dd"
	* - Number decimal separator must be "." and there should be no thousand separator */
	convertionParam.rowConverter = function(inputRow) {
		var convertedRow = {};

		/** MODIFY THE FIELDS NAME AND THE CONVERTION HERE 
		*   The right part is a statements that is then executed for each inputRow
		
		/*   Field that start with the underscore "_" will not be exported 
		*    Create this fields so that you can use-it in the postprocessing function */
		/* use the Banana.Converter.toInternalDateFormat to convert to the appropriate date format */
		convertedRow["Date"] = Banana.Converter.toInternalDateFormat(inputRow["交易日期"], "yyyymmdd");
		convertedRow["Description"] = inputRow["Kommentar"];
		//convertedRow["_Description2"] = inputRow["Gruppe nach"];
		/* use the Banana.Converter.toInternalNumberFormat to convert to the appropriate number format 
		*  we already have negative amounts in Betrag and don't need the to fill the column Expenses*/
		convertedRow["Income"] = Banana.Converter.toInternalNumberFormat(inputRow["贷方"], ".");
		convertedRow["Expenses"] = Banana.Converter.toInternalNumberFormat(inputRow["借方"], ".");
		//convertedRow["VatCode"] = inputRow["MWST Code"];
		//convertedRow["ContraAccount"] = inputRow["Kategorie"];
		//convertedRow["Account"] = inputRow["Art"];
		convertedRow["ExternalReference"] = inputRow["传票号"];
		
		/** END */


		return convertedRow;
	};
	return convertionParam;
}



function preProcessInData(inData) {
	return inData;
}



//The purpose of this function is to let the user specify how to convert the categories
function postProcessIntermediaryData(intermediaryData) {

	/** INSERT HERE THE LIST OF ACCOUNTS NAME AND THE CONVERSION NUMBER 
	*   If the content of "Account" is the same of the text 
	*   it will be replaced by the account number given */
	//Accounts conversion
	var accounts = {

		"Raiffeisen Kontokorrent" : "1020",

		//...
		"xxxInsertBefore " : "0000"
		
	}

	/** INSERT HERE THE LIST OF CATEGORIES NAME AND THE CONVERSION NUMBER 
	*   If the content of "ContraAccount" is the same of the text 
	*   it will be replaced by the account number given */

	//Categories conversion
	var categories = {

		"Abschreibung Praxisinnenausbau" : "6921",
		"Abschreibungen mobile Sachanlagen" : "6920",

		//...
		"xxxInsertBefore " : "0000"
		
	}

	//Apply the conversions
	for (var i = 0; i < intermediaryData.length; i++) {
		var convertedData = intermediaryData[i];

		//Convert
      if (convertedData["ContraAccount"]) {
         var cleanContraAccount = convertedData["ContraAccount"].replace(/\(.*/,'').trim(); //We delete everything between parentheses
         if (categories.indexOf(cleanContraAccount) > -1)
            convertedData["ContraAccount"] = categories[cleanContraAccount];
      }

      if (convertedData["Account"]) {
         if (accounts.indexOf(convertedData["Account"]) > -1)
            convertedData["Account"] = accounts[convertedData["Account"]];
      }

		if (convertedData["_Description2"]) {
			convertedData["Description"] = convertedData["_Description2"] + ", " + convertedData["Description"];
		}
   }
}






/* DO NOT CHANGE THIS CODE */

// Convert to an array of objects where each object property is the banana columnNameXml
function convertToIntermediaryData(inData, convertionParam) {
   if (convertionParam.format === "html") {
      return convertHtmlToIntermediaryData(inData, convertionParam);
   } else {
      return convertCsvToIntermediaryData(inData, convertionParam);
   }
}

// Convert to an array of objects where each object property is the banana columnNameXml
function convertCsvToIntermediaryData(inData, convertionParam) {

	var form = [];
	var intermediaryData = [];
	//Add the header if present 
	if (convertionParam.header) {
		inData = convertionParam.header + inData;
	}

	//Read the CSV file and create an array with the data
	var csvFile = Banana.Converter.csvToArray(inData, convertionParam.separator, convertionParam.textDelim);

	//Variables used to save the columns titles and the rows values
	var columns = getHeaderData(csvFile, convertionParam.headerLineStart); //array
	var rows = getRowData(csvFile, convertionParam.dataLineStart); //array of array

	//Load the form with data taken from the array. Create objects
	loadForm(form, columns, rows);

	//Create the new CSV file with converted data
	var convertedRow;
	//For each row of the form, we call the rowConverter() function and we save the converted data
	for (var i = 0; i < form.length; i++) {
		convertedRow = convertionParam.rowConverter(form[i]);
		intermediaryData.push(convertedRow);
	}

	//Return the converted CSV data into the Banana document table
	return intermediaryData;
}

// Convert to an array of objects where each object property is the banana columnNameXml
function convertHtmlToIntermediaryData(inData, convertionParam) {

   var form = [];
   var intermediaryData = [];

   //Read the HTML file and create an array with the data
   var htmlFile = [];
   var htmlRows = inData.match(/<tr[^>]*>.*?<\/tr>/gi);
   for (var rowNr = 0; rowNr < htmlRows.length; rowNr++ ) {
      var htmlRow = [];
      var htmlFields = htmlRows[rowNr].match(/<t(h|d)[^>]*>.*?<\/t(h|d)>/gi);
      for (var fieldNr = 0; fieldNr < htmlFields.length; fieldNr++ ) {
         var htmlFieldRe =  />(.*)</g.exec(htmlFields[fieldNr]);
         htmlRow.push(htmlFieldRe.length > 1 ? htmlFieldRe[1] : "");
      }
      htmlFile.push(htmlRow);
   }

   //Variables used to save the columns titles and the rows values
   var columns = getHeaderData(htmlFile, convertionParam.headerLineStart); //array
   var rows = getRowData(htmlFile, convertionParam.dataLineStart); //array of array

   //Convert header names
   for (var i = 0; i < columns.length; i++) {
      var convertedHeader = columns[i];
      convertedHeader = convertedHeader.toLowerCase();
      convertedHeader = convertedHeader.replace(" ", "_");
      var indexOfHeader = columns.indexOf(convertedHeader);
      if (indexOfHeader >= 0 && indexOfHeader < i) { // Header alreay exist
         //Avoid headers with same name adding an incremental index
         var newIndex = 2;
         while (columns.indexOf(convertedHeader + newIndex.toString()) !== -1 && newIndex < 99)
            newIndex++;
         convertedHeader = convertedHeader + newIndex.toString()
      }
      columns[i] = convertedHeader;
   }

   Banana.console.log(JSON.stringify(columns, null, "   "));

   //Load the form with data taken from the array. Create objects
   loadForm(form, columns, rows);

   //Create the new CSV file with converted data
   var convertedRow;
   //For each row of the form, we call the rowConverter() function and we save the converted data
   for (var i = 0; i < form.length; i++) {
      convertedRow = convertionParam.rowConverter(form[i]);
      intermediaryData.push(convertedRow);
   }

   //Return the converted CSV data into the Banana document table
   return intermediaryData;
}

// The purpose of this function is to sort the data
function sortData(intermediaryData, convertionParam) {
   if (convertionParam.sortColums && convertionParam.sortColums.length) {
      intermediaryData.sort(
               function(row1, row2) {
                  for (var i = 0; i < convertionParam.sortColums.length; i++) {
                     var columnName = convertionParam.sortColums[i];
                     if (row1[columnName] > row2[columnName])
                        return 1;
                     else if (row1[columnName] < row2[columnName])
                        return -1;
                  }
                  return 0;
               });

      if (convertionParam.sortDescending)
         intermediaryData.reverse();
   }

   return intermediaryData;
}

//The purpose of this function is to convert all the data into a format supported by Banana
function convertToBananaFormat(intermediaryData) {

	var columnTitles = [];
	
	//Create titles only for fields not starting with "_"
	for (var name in intermediaryData[0]) {
		if (name.substring(0,1) !== "_") {
			columnTitles.push(name);
		}
		
	}
	//Function call Banana.Converter.objectArrayToCsv() to create a CSV with new data just converted
   var convertedCsv = Banana.Converter.objectArrayToCsv(columnTitles, intermediaryData, "\t");

	return convertedCsv;
}


//The purpose of this function is to load all the data (titles of the columns and rows) and create a list of objects.
//Each object represents a row of the csv file
function loadForm(form, columns, rows) {
	for(var j = 0; j < rows.length; j++){
		var obj = {};
		for(var i = 0; i < columns.length; i++){
			obj[columns[i]] = rows[j][i];
		}
		form.push(obj);
	}
}


//The purpose of this function is to return all the titles of the columns
function getHeaderData(csvFile, startLineNumber) {
	if (!startLineNumber) {
		startLineNumber = 0;
	}
	var headerData = csvFile[startLineNumber];
	for (var i = 0; i < headerData.length; i++) {

		headerData[i] = headerData[i].trim();

      if (!headerData[i]) {
         headerData[i] = i;
      }

      //Avoid duplicate headers
      var headerPos = headerData.indexOf(headerData[i]);
      if (headerPos >= 0 && headerPos < i) { // Header already exist
         var postfixIndex = 2;
         while (headerData.indexOf(headerData[i] + postfixIndex.toString()) !== -1 && postfixIndex <= 99)
            postfixIndex++; // Append an incremental index
         headerData[i] = headerData[i] + postfixIndex.toString()
      }

	}
	return headerData;
}


//The purpose of this function is to return all the data of the rows
function getRowData(csvFile, startLineNumber) {
	if (!startLineNumber) {
		startLineNumber = 1;
	}
	var rowData = [];
	for (var i = startLineNumber; i < csvFile.length; i++) {
		rowData.push(csvFile[i]);
	}
	return rowData;
}

