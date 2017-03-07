// -- Course Recommendations - By achiu@ais.edu.hk --
// This App displays logged-in teacher's students for recommendation (from spreadsheet)
//

// -- GLOBALS --
//Get Lists from Spreadsheet
//var myListDocID = '0AkB30i6AUCFldFFMUmV3RDBjU1kxaHJhWlExdmtUWkE' //Trial Course List File
var myListDocID = '0AkB30i6AUCFldDFfTkZwZmpOMThOOGZjZEZzVmNtNUE' //Live Course List File Apr 2012-13 for 2013-2014 choices
//Spreadsheet sheet names for Get Lists...
var myListSheetName = 'Choices';
var myCreditsSheetName = 'Transcript';
var myGradReqsSheetName = 'GradReqs';
var myStudentDataSheetName = 'StudentList';
var myTeacherCoursesSheetName = 'TeacherCourses';
var myRecCourseListSheetName = 'RecCourseList';


//Spreadsheet for saving student choices. 
//var mySurveyCollector = '0AkB30i6AUCFldC1hd2d6QW4tanY3Zk9CZm9YMGNWaGc'; //Trial Spreadsheet
var mySurveyCollector = '0AkB30i6AUCFldFVyTzY1U012cGlBT29aQTFfMHIwMmc'; //Live collector in 2012-13 for 2013-14 choices
var mySurveySheetName = 'Results';
var mySurveyCourseCounts = 'CourseCounts';
//var myRecommendationSheetName = 'Recommendation';
var myRecommendationSheetName = 'Request';

//Get User
var thisUser = Session.getActiveUser().getEmail(); //Logged-in User
//var thisUser = '210040@ais.edu.hk';  // 1 - Alex KS Chen
//var thisUser = '210180@ais.edu.hk'; // 2
//var thisUser = 'kerickson@ais.edu.hk';
//var thisUser = 'aczarnobaj@ais.edu.hk';
//var thisUser = 'mwing@ais.edu.hk';


var tHeadingMap = [ 10, 9, 6]; //Maps the cols in TeacherCourses sheet to Transcript sheet for filtering students.

//For HTMLService app (from template)
//var userSheetName = 'Members';
var challengeSheetName = 'Recommendations';
var appTitle = 'Recommendations';
var entityTitle = 'Recommendations'; // used in titles throughout app


/* 
* doGet - called when web URL accessed
*/
function doGet() {

// Check Permissions here if you wish to check user permissions

// Load index.html
  var myDoc = 'Bootstrap';  
//  var myDoc = 'index'; 
  return HtmlService.createTemplateFromFile(myDoc).evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
}


function loadGInfo() {
  
  //CHECK AND LOG USER ACCESS  
  
  //GET LIST OF COURSES AND RETURN
  var thisSheet = SpreadsheetApp.openById(myListDocID);
  var teacherListSheet = thisSheet.getSheetByName(myTeacherCoursesSheetName);
  var lvl1Col = 1; //set column in TecherCourses to look up for Course Codes.  
  
  var myData = getRowsMatching(teacherListSheet.getRange(2, 1, teacherListSheet.getLastRow(), teacherListSheet.getLastColumn()).getValues(),0,thisUser);

  Logger.log(myData);
  //GRAB DATA FROM SPREADSHEET (transcripts and list of rec options)
  //get list of teacher's current students from transcript
  var transcriptSheet = thisSheet.getSheetByName(myCreditsSheetName);
  var getAllTranscripts = transcriptSheet.getRange(1,1,transcriptSheet.getLastRow(), transcriptSheet.getLastColumn()).getValues();  
  
  //Read and load student recommendation data from spreadsheet for use later (streamlining 14-Mar-2014)
  var recSheet = SpreadsheetApp.openById(mySurveyCollector).getSheetByName(myRecommendationSheetName);
  var lastRow = recSheet.getLastRow();
  var recSheetData = recSheet.getDataRange().getValues();
  //End Load Rec Data 14-Mar-2014
  
  //get courses that can be recommended in this department
  var recsListSheet = thisSheet.getSheetByName(myRecCourseListSheetName);
  var departmentChoices = recsListSheet.getDataRange().getValues();

  //Change all date values into JSON for passing through HTMLservice (dates are causing errors)
  for (var n=1;n < recSheetData.length; n++) {
    if (recSheetData[n][6] instanceof Date) recSheetData[n][6] = recSheetData[n][6].toJSON();
    }
  
  //Get StudentList
  var studentInfo = textifyDates(thisSheet.getSheetByName(myStudentDataSheetName).getDataRange().getValues());
  
  var myDepts = ArrayLib.unique(myData, 2);
  
  var HRMList = ArrayLib.unique(studentInfo,2);
  
  Logger.log({courses: myData, transcripts: getAllTranscripts, recData: recSheetData, deptChoices: departmentChoices})
  //RETURN DATA (course list, full transcripts, completed recs) TO HTML
  return {courses: myData, transcripts: getAllTranscripts, recData: recSheetData, deptChoices: departmentChoices, studentInfo: studentInfo, myDepts: myDepts, HRMList: HRMList};

}

function getRecCounts(){
  var thisSheet = SpreadsheetApp.openById(mySurveyCollector);
  var recData = thisSheet.getSheetByName(myRecommendationSheetName).getDataRange().getValues();
  return recData;
}

/* include - allows html content to be included */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}

//---------------
//
// postThisRec2 - called when a recommendation checkbox is clicked
//
//---------------
function postThisRec2(action, recID, studentEmail, course, department){
  
  var thisUserStudID = studentEmail.substring(0,studentEmail.search('@'));
  var sheet = SpreadsheetApp.openById(mySurveyCollector).getSheetByName(myRecommendationSheetName);

  var actionAdd = (action == 1); //action Add should show true if recommendation is added, false if rec is being removed.
  
  //Read and load student recommendation data from spreadsheet for use later (streamlining 14-Mar-2014)
  var recSheet = SpreadsheetApp.openById(mySurveyCollector).getSheetByName(myRecommendationSheetName);
  var lastRow = recSheet.getLastRow();
  var recSheetData = recSheet.getRange(1,1,lastRow,7).getValues();
  //End Load Rec Data 14-Mar-2014
  
  Logger.log([action, recID, studentEmail, course, actionAdd]);
  var label2 = false;
  //If record doesn't exist then write it
  var recExists = alreadyRecommended(recSheetData, recID);
      Logger.log([action,recExists, actionAdd]);  
  var myTimeStamp = new Date();

  var lock = LockService.getPublicLock();
  lock.waitLock(30000);
  
  //Get the right row number
  if(recExists >= 0){
    var thisRow = ArrayLib.find(sheet.getRange(1,1,sheet.getLastRow(),7).getValues(), 0, recID) +1; 
  } else {
    var thisRow = sheet.getLastRow()+1;
  }
  //Write the row
  var targetRange = sheet.getRange(thisRow, 1, 1, 8).setValues([[recID, thisUserStudID, studentEmail, course, department, thisUser, myTimeStamp, actionAdd]] );    
  
  // clean up and release the lock
  SpreadsheetApp.flush();
  lock.releaseLock();
    
  //update the label
  label2 = actionAdd;
  return [recID, label2];
}



// ----------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------
// ----------------------------------------------------------------------------------
// -----
//  OlddoGet - main function for web app
// -----
function OlddoGet() {
  var app = UiApp.createApplication().setTitle("High School Recommend Students App");
  
  var vCols = app.createVerticalPanel().setId('vCols');
  var studentPanel = app.createHorizontalPanel().setId('myStudentPanel'); //create a panel for displaying student info.
  
  //var teacherListSheet = SpreadsheetApp.openById(myListDocID).getSheetByName(myTeacherCoursesSheetName);
  

  //--- START - add course section filter listbox
  
  var teacherListSheet = SpreadsheetApp.openById(myListDocID).getSheetByName(myTeacherCoursesSheetName);
  var lvl2Col = 1; //set column in TecherCourses to look up for Course Codes.  
  
  var myData = getRowsMatching(teacherListSheet.getRange(2, 1, teacherListSheet.getLastRow(), teacherListSheet.getLastColumn()).getValues(),0,thisUser);
  var l2d = new Array();
  for (var i=0; i<myData.length; i++) l2d[i] = myData[i][lvl2Col];
  var lvl2Data = ArrayLib.unique(l2d).sort();
  
  
  //create filter list (of current logged-in user's Courses), with an event handler
  var lvl2List = app.createListBox(false)
                         .setId('tLvl2List')
                         .setName('tLvl2List')
                         .addChangeHandler(app.createServerChangeHandler('tLevel2Handler')
                                              .addCallbackElement(vCols));
  
  //Populate listbox with courses
  for (var i=0; i < lvl2Data.length; i++) {
    lvl2List.addItem(lvl2Data[i]);
  }
 
  //Create panel to hold filter.
  var level2Panel = app.createHorizontalPanel()
                       .setId('FilterPanel')
                       .add(app.createHTML('MY COURSES (filter):'))
                       .add(lvl2List);

  //--- END Course Filter  
  
  //--- Show Students - based on first course section of teacher.
  showMyStudents(app, studentPanel, 9, lvl2Data[0]); //add myStudentList
  
  vCols.add(app.createHTML('<h1>Enter Recommendations</h1>'));
  vCols.add(app.createHTML('<h2>Viewing students taught by: ' + thisUser +'</h2>'));
  
  vCols.add(level2Panel);
  vCols.add(studentPanel);
  vCols.add(app.createVerticalPanel().setId('statusLog').add(app.createHTML('Status:')));
  app.add(vCols);


  return app;
}

function myClickHandler(e) {
  var app = UiApp.getActiveApplication();

  var label = app.getElementById('statusLabel');
  label.setVisible(true);

  app.close();
  return app;
}


//-------
//DO POST
//-------

function doPost(e) {
  
 
  var app = UiApp.getActiveApplication();
  var action = e.parameter.action;
  var recID = e.parameter.RecID;
  var studentEmail = e.parameter.Student;
  var course = e.parameter.Course;
  var department = e.parameter.Dept;
  
  return postThisRec(app, action, recID, studentEmail, course, department);


}


//-----
// function postThisRec(app, action, recID, studentEmail, course, department)
//
// Posts the given recommendation into the spreadsheet and returns the status
//-----

function postThisRec(app, action, recID, studentEmail, course, department){
  
  var thisUserStudID = studentEmail.substring(0,studentEmail.search('@'));
  var sheet = SpreadsheetApp.openById(mySurveyCollector).getSheetByName(myRecommendationSheetName);

  
  //Read and load student recommendation data from spreadsheet for use later (streamlining 14-Mar-2014)
  var recSheet = SpreadsheetApp.openById(mySurveyCollector).getSheetByName(myRecommendationSheetName);
  var lastRow = recSheet.getLastRow();
  var recSheetData = recSheet.getRange(1,1,lastRow,7).getValues();
  //End Load Rec Data 14-Mar-2014
 
   var label2 = 'error - not written';
  //If record doesn't exist then write it
  var recExists = alreadyRecommended(recSheetData, recID);
      Logger.log([action,recExists]);
  if( action == 1 && recExists == -1 ){
    
    var myTimeStamp = new Date();
    // get the lock, because we're now modifying the shared resource
    var lock = LockService.getPublicLock();
    lock.waitLock(30000);
    
    

    //Logger.log('in');
    //Logger.log([recID, thisUserStudID, studentEmail, course, department, thisUser, new Date()]);
    var targetRange = sheet.getRange(sheet.getLastRow()+1, 1, 1, 7).setValues([[recID, thisUserStudID, studentEmail, course, department, thisUser, myTimeStamp]] );    


    
    SpreadsheetApp.flush();
    // clean up and release the lock
    lock.releaseLock();
    
    label2 = '<span style="color:red; font-size:9px;">'  
    +'Added Recommendation: ' 
    + thisUserStudID + ' ' 
    + course 
    + ' </span>';
  }
  else if (action == -1 && recExists >= 0){
    var lock = LockService.getPublicLock();
    lock.waitLock(30000);
    
    // Get the row to delete based off recID.
    var thisRow = ArrayLib.find(sheet.getRange(1,1,sheet.getLastRow(),7).getValues(), 0, recID) +1; 
    //Delete the row.
    var targetRange = sheet.deleteRow(thisRow);
    //update the label
    label2 = '<span style="color:red; font-size:9px;">Cleared Recommendation:'     
    + thisUserStudID + ' ' 
    + course 
    +'</span>';
    lock.releaseLock();
  }
  
   //Display a confirmation message in status area and update the form to display


  recSheetData = recSheet.getRange(1,1,recSheet.getLastRow(),7).getValues(); //update the rec data again
  
  var myFPanel = app.getElementById(recID);
  myFPanel.clear();
  myFPanel.add(recForm(app,studentEmail,course,department,recID,recSheetData));
  var myStatusPanel = app.getElementById('statusLog');
  myStatusPanel.add(app.createHTML(label2));
  return app;
}



//-----
// showMyStudents - updates the display of students and recommendation buttons into the studentPanel, filtering by criteria matching row passed.
//-----

function showMyStudents(app, studentPanel, row, criteria){
  
  //get list of teacher's current students from transcript
  var thisSheet = SpreadsheetApp.openById(myListDocID);
  var transcriptSheet = thisSheet.getSheetByName(myCreditsSheetName);
  
  
  //Read and load student recommendation data from spreadsheet for use later (streamlining 14-Mar-2014)
  var recSheet = SpreadsheetApp.openById(mySurveyCollector).getSheetByName(myRecommendationSheetName);
  var lastRow = recSheet.getLastRow();
  var recSheetData = recSheet.getRange(1,1,lastRow,7).getValues();
  //End Load Rec Data 14-Mar-2014
  
  
  //Get current students only and then filter only those matching the criteria passed (usually course code)
  var getAllTranscripts = transcriptSheet.getRange(1,1,transcriptSheet.getLastRow(), transcriptSheet.getLastColumn()).getValues();
  var getCurrentStudents = getRowsMatching(getAllTranscripts, 7, 'Current');
  var myStudents = getRowsMatching(getCurrentStudents, row, criteria);

  //Sort the items by Family Name
  myStudents.sort(function(a, b){ 
    var x = a[2];
    var y = b[2];
    return (x < y ? -1 : (x > y ? 1 : 0));});
  
  
  //get courses that can be recommended in this department
  var recsListSheet = thisSheet.getSheetByName(myRecCourseListSheetName);
  var recsLastRow = recsListSheet.getLastRow();
  
    //thisRow will be used to set grid row offset.
  var rowOffset =2;
  var thisRow =0;
  
  var sGrid = app.createGrid(myStudents.length+rowOffset, 3)
                 .setBorderWidth(1);
  
  sGrid.setWidget(0,1, app.createHTML('<h1>'+ criteria +'</h1>')); //Add title
  
  
  //header of the grid
  sGrid.setWidget(1,0, app.createHTML('Student')); //show student name
  sGrid.setWidget(1,1, app.createHTML('Recommendations<br />(click course code to recommend or X to clear recommendation)')); //show rec buttons
  sGrid.setWidget(1,2, app.createHTML('Credits earned in this department'));//Print all courses in grid.
  
  //Add All row - a row with option to add all students to a particular course.
  

  
  //For each student in the list, print out a row displaying info and rec buttons
  for (var s=0; s < myStudents.length; s++){
    
    thisRow = s+rowOffset;
    
    var myDispName = myStudents[s][3] + ' ' + myStudents[s][2] + ' - (' + myStudents[s][0] +') G'+ myStudents[s][4];
    
    //If student is not in G12 write recommendation forms
    if(myStudents[s][4]!='12'){
      var buttonPanel = app.createHorizontalPanel();
      var recList = usableColValues(recsListSheet.getRange(2, myStudents[s][5], recsLastRow-1, 1).getValues(),recsLastRow-1);
      
 
      //for each recommendable subject, place a form and button here.
      for (var r=0; r<recList.length; r++) {
        var recID = myStudents[s][0]+recList[r]; //Create unique recommendation ID made up of StudentID and Coursecode.
        var myFContainer = app.createHorizontalPanel().setId(recID);
        //Add the recommendation form to the container,
        myFContainer.add(recForm(app,myStudents[s][1],recList[r],myStudents[s][5],recID,recSheetData) ).setWidth('70px');
        buttonPanel.add(myFContainer);
      }

      
      sGrid.setWidget(thisRow,1, buttonPanel); //show rec buttons     
    }
    
    //get credits of this student, in this department
    var thisDeptCreds = getRowsMatching(getRowsMatching(getAllTranscripts,1,myStudents[s][1]),6,myStudents[s][6]); 
    var thisDeptTotal = 0; //Reset Credits counter (for summing credits in this department)
    var myCourses = '';
    
    //If student has credits in this department, list them.
    if (typeof thisDeptCreds[0] !== 'undefined') { 
      //Sort the items by Year completed
      thisDeptCreds.sort(function(a, b){ 
        var x = a[7];
        var y = b[7];
        return (x < y ? -1 : (x > y ? 1 : 0));});      
      //For each credit  
      for (var myCreds = 0; myCreds <= thisDeptCreds.length - 1; myCreds++){
        thisDeptTotal += thisDeptCreds[myCreds][8];
        if (thisDeptCreds[myCreds][7] == 'Current') {//Make font red if it is "current"
          myCourses += '<span style="color:A00;">'+thisDeptCreds[myCreds][9] + ' (' + thisDeptCreds[myCreds][7] +');</span><br />'; 
        }
        else  myCourses += thisDeptCreds[myCreds][9] + ' (' + thisDeptCreds[myCreds][7] +');  '; 
      }
      
      myCourses = '<b>Total: ' + thisDeptTotal +'credits: </b>' + myCourses;
    } 
    
    sGrid.setWidget(thisRow,2, app.createHTML(myCourses).setStyleAttribute('font-size', '10px'));//Print all courses in grid.
    sGrid.setWidget(thisRow,0, app.createHTML(myDispName).setStyleAttribute('vertical-align','top')); //show student name
      
  }
 
  studentPanel.clear();
  studentPanel.add(sGrid);
 
  //return studentPanel;
}

//-----
// recForm(app, student, course, dept, recID) - creates and returns a panel with a form for the relevant actions available for a recommendation
// 
//-----
function recForm(app, student, course, dept, recID, recSheetData){

  var thisForm = app.createFormPanel();
  var mySubmitBtn = app.createSubmitButton(''); //create a submit button

  var formPanel = app.createHorizontalPanel().setVerticalAlignment(UiApp.VerticalAlignment.MIDDLE)
    .add(app.createHidden('Student', student))
    .add(app.createHidden('Course', course))
    .add(app.createHidden('Dept', dept))
    .add(app.createHidden('RecID', recID));
  //if not yet recommended, create button to recommend, else, give option to delete.
  if( alreadyRecommended(recSheetData, recID) == -1) {
    formPanel.add(mySubmitBtn.setText(course)).add(app.createHidden('action', 1));
  } else {
    
    formPanel.add(app.createHTML(course));
    formPanel.add(mySubmitBtn.setText('x')).add(app.createHidden('action', -1));
  }

  //Create a button disable client handler and apply to the form (disables the rec button once pressed)  
  var buttonDisabler = app.createClientHandler().forTargets(mySubmitBtn).setEnabled(false);
  thisForm.addSubmitHandler(buttonDisabler); 

  //add form and panel to the app
  thisForm.add(formPanel);

  return thisForm;
}

//-----
// Handler for Filter list box
//-----
function tLevel2Handler(e){
  var app = UiApp.getActiveApplication();
  var col = parseInt(e.parameter.tHeadingsList);
  var criteria = e.parameter.tLvl2List;
  var studentPanel = app.getElementById('myStudentPanel');
  
  showMyStudents(app, studentPanel, 9,criteria);
  
  return app;
}


//-----
//   getRowsMatching takes a data list and searches the sortIndex for all values that match valueToFind, returning the rows that match this value
//-----

function getRowsMatching(myDataList, sortIndex, valueToFind){
  
  var foundList = new Array();
  
  myDataList.sort(function(a, b){ //Sort the items by studentID
    var x = a[sortIndex];
    var y = b[sortIndex];
    return (x < y ? -1 : (x > y ? 1 : 0));});
  
  var cdr = 0;
  var found = false; 
  
  while ( cdr < myDataList.length){
    if (myDataList[cdr][sortIndex] == valueToFind) {
      found=true;
      foundList.push(myDataList[cdr])
    }
    else if (found){
      return foundList;
    }
    cdr++;
  }

  return foundList;
  
}


//-------
// Function usableColValues - returns the rows that are not blank within a column
//-------
function usableColValues(coldata, lastrow) {
  for( var i = (lastrow - 1) ; i > 0; i--){

    if(coldata[i] != "") {
      return coldata.slice(0,i+1);
      };
  };
  return coldata;
}

function createTestListBox(app){
  var myTestList = app.createListBox().setName('testList');
  
  var myForm = app.createFormPanel().setId('myForm').setEncoding('multipart/form-data');
  var inputList = testArrayInArray();
  var hidden = new Array();
  var myPanel = app.createVerticalPanel();
  
  for (var i=0; i<inputList.length;i++){
    myTestList.addItem(inputList[i]);
    myPanel.add(app.createHidden('a'+String(i), i));
  }
  
  myPanel.add(myTestList);
  myForm.add(myPanel);

  
  return myForm;
} 



//-----
// testArrayinArray(a)
//-----
function testArrayInArray(){

  var bigA = new Array();
  var smallA = new Array();
  
  for(var i=0; i<3; i++){
    for(var j=0; j<3; j++){
      smallA[j] = String(i)+'-'+String(j);
    }
    bigA[i] = [i, 'ABC', [i, i+1, i+2], smallA ];
  }
  
  return bigA;
}


//-----
// alreadyRecommended(a, recID)
//-----

function alreadyRecommended(sheetData, recID){
  /* Moved the loading of RecData from spreadsheet out to calling function for streamlining (14-Mar-2014)
  var recSheet = SpreadsheetApp.openById(mySurveyCollector).getSheetByName(myRecommendationSheetName);
  var lastRow = recSheet.getLastRow();
  var recSheetData = recSheet.getRange(1,1,lastRow,7).getValues();
  */

  
  return ArrayLib.find(sheetData, 0, recID);
}

//-----
// function textifyDates(myArr) - converts all dates into text format - assumes a 2D array as an input, returns the array.
//-----
function textifyDates(myArr){
  
  for(var r=0; r < myArr.length; r++){
    for(var c=0; c < myArr[r].length; c++){
      if (Object.prototype.toString.call(myArr[r][c]) === '[object Date]'){
        try { myArr[r][c] = Utilities.formatDate(myArr[r][c], "GMT+08:00", "dd-MMM-yyyy")} 
        catch(err) { myArr[r][c] = err};
      }
    }
  }
  return myArr;
}