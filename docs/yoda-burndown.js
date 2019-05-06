//  Copyright 2018 Hewlett Packard Enterprise Development LP
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
// and associated documentation files (the "Software"), to deal in the Software without restriction, 
// including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
// and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or 
// substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
// PURPOSE AND NONINFRINGEMENT.
//
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR 
// OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF 
// OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

var repoList = [];  // selected repos
var repoMilestones = []; // Double-array of repos,milestone (full structure) for selected repos

var commonMilestones = []; // Options for milestone selection (milestones in all repos, just title).

function addIfNotDefault(params, field) {
	if ($("#" + field).val() != $("#" + field).prop('defaultValue')) {
		return params + "&" + field + "=" + $("#" + field).val(); 
	} else {
		return params;
	}
}

function getUrlParams() {
	var params = "owner=" + $("#owner").val() + "&repolist=" + $("#repolist").val();
	params += "&estimate=" + yoda.getEstimateInIssues();
	params = addIfNotDefault(params, "labelsplit");	
	params = addIfNotDefault(params, "additionaldata");
	params = addIfNotDefault(params, "rnlabeltypes");
	params = addIfNotDefault(params, "tentative");	
	params = addIfNotDefault(params, "inprogress");	
	if ($("#milestonelist").val() != "") {
		params += "&milestone=" + $("#milestonelist").val(); 
	}
	if (!$('#showclosed').is(":checked")) {
		params += "&showclosed=false";
	}
	if ($('#closedmilestones').is(":checked")) {
		params += "&closedmilestones=true";
	}

	return params;
}
	
function estimateClick(radio) {
	yoda.setEstimateInIssues(radio.value);
}

//---------------------------------------
function clearTable() {
	var table = document.getElementById("issuesTable");
	table.innerHTML = "";
}

function clearRN() {
	var rn = document.getElementById("RN");
	rn.innerHTML = "";
}

// -----------

function prepareSums(sums, labelItem) {
	if (sums[labelItem] == undefined) {
		var entry = {
				totalEstimate: 0,
				totalRemaining: 0,
				totalTentative: 0,
				totalTasks: 0,
				totalCompletedTasks: 0,
				totalIssues: 0
		};
		sums[labelItem] = [];
		sums[labelItem]["open"] = yoda.deepCopy(entry);
		sums[labelItem]["closed"] = yoda.deepCopy(entry);
		sums[labelItem]["inprogress"] = yoda.deepCopy(entry);
		sums[labelItem]["all"] = yoda.deepCopy(entry);
	}
}


function splitValues(sums, assigneeList, field, subField, value) {
	// Ok, we need to split the value, but not into too smart parts
	var noAssignees = assigneeList.length;
	var valueSplit = value / noAssignees;
	
	for (var as = 0; as < assigneeList.length; as++) {
		sums[assigneeList[as]][subField][field] += valueSplit;
	}
}

// -----------
// Example call: 	incrementCount(sums, "Grand Total", labelItem, assignee, "totalEstimate", est, issues[i]);
function incrementCount(sums, l1, l2, assigneeList, field, value, issue) {
	sums[l1]["all"][field] += value;
	sums[l2]["all"][field] += value;
	splitValues(sums, assigneeList, field, "all", value);

	sums[l1][issue.state][field] += value;
	sums[l2][issue.state][field] += value;
	splitValues(sums, assigneeList, field, issue.state, value);
	
	// and maybe into inprogress state as well.
	var inprogressLabel = $("#inprogress").val();
	if (yoda.isLabelInIssue(issue, inprogressLabel)) {
		sums[l1]["inprogress"][field] += value;
		sums[l2]["inprogress"][field] += value;
		splitValues(sums, assigneeList, field, "inprogress", value);
	}
}

function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

// ---

function insertTotalsRow(bodyRef, sums, labelItem, c1, c2, c3, c4, c5, issueState) {
	if (issueState == undefined)
		issueState = "all";

	row = bodyRef.insertRow();
	var cell = row.insertCell();
	cell.innerHTML = c1;

	var cell = row.insertCell();
	cell.innerHTML = c2;

	var cell = row.insertCell();
	cell.innerHTML = c3;

	var cell = row.insertCell();
	cell.innerHTML = c4;

	var cell = row.insertCell();
	cell.innerHTML = c5;
	
	// AdditonalData

	if ($("#additionaldata").val() != "") {
		var cell = row.insertCell();
		cell.innerHTML = "";
	}

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + round(sums[labelItem][issueState].totalEstimate, 1) + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + round(sums[labelItem][issueState].totalRemaining, 1) + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + round(sums[labelItem][issueState].totalTasks, 1) + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + round(sums[labelItem][issueState].totalCompletedTasks, 1) + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + round(sums[labelItem][issueState].totalTentative, 1) + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + round(sums[labelItem][issueState].totalIssues, 1) + "</b>";
	cell.style.textAlign = "right";
}

function insertBlankRow(bodyRef, firstField) { 
	var row = bodyRef.insertRow();
	for (var i = 0; i < 11; i++) {
		cell = row.insertCell();
		if (i == 0 && firstField != undefined) {
			cell.innerHTML = firstField;
		}
	}
	if ($("#additionaldata").val() != "") {
		row.insertCell();
	}
}

// ----------

function saveTableToCSV() {
	var header = $("#issuesTable thead")[0].rows[0];
	var data = []; 
	var headers = [];
	for (var i=0; i<header.cells.length; i++) {
		headers[i] = header.cells[i].innerHTML.replace(/<(?:.|\n)*?>/gm, ''); 
	} 

	var tableRows = $("#issuesTable tbody")[0].rows;
	for (var i=0; i<tableRows.length; i++) { 
		var tableRow = tableRows[i]; var rowData = {}; 
		for (var j=0; j<tableRow.cells.length; j++) { 
			rowData[headers[j]] = tableRow.cells[j].innerHTML.replace(/<(?:.|\n)*?>/gm, ''); 
		} data.push(rowData); 
	} 
	
	config = {
			quotes: false,
			quoteChar: '"',
			delimiter: ";",
			header: true,
			newline: "\r\n"
		};
	
	result = Papa.unparse(data, config);
	var repoName = String($("#repolist").val()).split(",").join("-");
	var fileName = $("#owner").val() + "-" + repoName + "-burndown.csv"; 
	yoda.downloadFile(result, fileName);
}

//---------------------------------------

function makeTable(issues) {
	if ($('#showclosed').is(":checked")) {
		var showClosed = true;
	} else {
		var showClosed = false;
	}

	clearAreas();
	
	// Filter out pull requests
	yoda.filterPullRequests(issues);
	
	// Sort by repository, number
	issues.sort(function(a,b) {
		if (a.repository_url == b.repository_url) {
			return (a.number - b.number); 
		}
		if (a.repository_url > b.repository_url) {
			return 1;
		} else {
			return -1;
		}
	});
	var tentativeLabel = $("#tentative").val();
	var inprogressLabel = $("#inprogress").val();

	var labelSplit = $("#labelsplit").val();
	console.log("Label split: " + labelSplit);
	
	var additionalData = $("#additionaldata").val();
	console.log("Additonal data: " + additionalData);
	var additionalReg = "";
	var additionalHL = "";
	if (additionalData != "") {
		var additionalSplit = additionalData.split(",");
		if (additionalSplit.length == 2) {
			additionalHL = additionalSplit[0];
			additionalReg = new RegExp(additionalSplit[1]);
			console.log("AdditonalReg: " + additionalReg);
		}
	}

	// Start setting up sums array
	var sums = [];
	prepareSums(sums, "Grand Total");
	prepareSums(sums, "");
	
	// Label magic (splitting based on label split filter, if specified)
	// Let's build a map of labels
	// Let's see if this look like a regular expression, or if it is simply a list of labels with , between.
	var labels = [];
	if (labelSplit.split(",").length > 1) {
		var ls = labelSplit.split(",");
		for (l = 0; l < ls.length; l++) {
			labels.push(ls[l].trim());
		}
	} else {
		if (labelSplit != "") {
			var splitReg = new RegExp(labelSplit);
			if (labelSplit != "") {
				for (i=0; i<issues.length; i++) {
					for (var l=0; l<issues[i].labels.length; l++) {
						var labelName = issues[i].labels[l].name;
						var res = labelName.match(splitReg);
						if (res != null) {
							if (labels.indexOf(labelName) == -1) {
								console.log("Found label: " + labelName);
								labels.push(labelName);
							}
						}
					}
				}
			}
			labels = labels.sort();
			console.log("Number of distinct labels: " + labels.length);
		}
	}
	// Note, let's push a special phantom label for unknown type.
	labels.push("Unknown Type");
	console.log("Labels: " + labels);
	for (var l = 0; l < labels.length; l++) {
		prepareSums(sums, labels[l]);
	}


	// Find table
	var table = document.getElementById("issuesTable");
	var header = table.createTHead();
	var headerRow = header.insertRow();     

	var cell = headerRow.insertCell();
	cell.innerHTML = "<u><b onclick=\"saveTableToCSV()\">Issue Id</b></u>" + " (" + issues.length + ")";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Assignee</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Tentative?</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Type</b>";

	if (additionalHL != "") {
		var cell = headerRow.insertCell();
		cell.innerHTML = "<b>" + additionalHL + "</b>";
	}

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Issue Title</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Estimate</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Remaining</b>";
	
	var cell = headerRow.insertCell();
	cell.innerHTML = "<b># Tasks</b>";
	
	var cell = headerRow.insertCell();
	cell.innerHTML = "<b># Tasks done</b>";
	
	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Tentative</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>State</b>";
	
	table.appendChild(document.createElement('tbody'));
	var bodyRef = document.getElementById('issuesTable').getElementsByTagName('tbody')[0];
	
	var assigneeSet = new Set();
	for (var i = 0; i < issues.length; i++) {
		if (showClosed == false && issues[i].state == 'closed')
			continue;
		
//		console.log(issues[i]);
		
		var row = bodyRef.insertRow();
		
		cell = row.insertCell();
		// Link
		var repository = issues[i].repository_url.split("/").splice(-1); // Repo name is last element in the url
		cell.innerHTML = "<a href=\"" + issues[i].html_url + "\" target=\"_blank\">" + repository + "/" + issues[i].number + "</a>";
		
		var assigneeList = [];
		var assigneeString = "";
		cell = row.insertCell();
		if (issues[i].assignees.length > 0) {
			for (var as = 0; as < issues[i].assignees.length; as++) {
				var assignee = issues[i].assignees[as].login;
				prepareSums(sums, assignee);
				assigneeSet.add(assignee);
				assigneeList.push(assignee);
				if (assigneeString != "") 
					assigneeString += ",<br>";
				assigneeString += assignee;
			}
		} else {
			var assignee = "unassigned";
			assigneeString = assignee;
			prepareSums(sums, assignee);
			assigneeSet.add(assignee);
			assigneeList.push(assignee);
		}
		cell.innerHTML = assigneeString;
		console.log("Assignee: " + assignee);
		
		cell = row.insertCell();
		if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
			cell.innerHTML = "Yes";
		} else {
			cell.innerHTML = "";
		}

		cell = row.insertCell();
		var labelItem = "";
		// Loop through labels to find match
		for (var l = 0; l < labels.length; l++) {
			if (yoda.isLabelInIssue(issues[i], labels[l])) {
				labelItem = labels[l];
			}
		}
		cell.innerHTML = labelItem;
		if (labelItem == "")
			labelItem = "Unknown Type";
		
		// AdditionalData
		if (additionalHL != "") {
			var addData = "";
			for (var l=0; l<issues[i].labels.length; l++) {
				var labelName = issues[i].labels[l].name;
				if (labelName.match(additionalReg) != null) {
					if (addData != "")
						addData = addData + ",<br>";
					addData = addData + labelName;
				}
			}

			cell = row.insertCell();
			cell.innerHTML = addData;
		}
		
		cell = row.insertCell();
		cell.innerHTML = issues[i].title;

		// # of issues
		incrementCount(sums, "Grand Total", labelItem, assigneeList, "totalIssues", 1, issues[i]);
		
		// Estimate
		cell = row.insertCell();
		cell.style.textAlign = "right";
		if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
			console.log("  Estimate for isue " + issues[i].number + " = 0 (tentative)");
			cell.innerHTML = "0";
		} else {
			var est = yoda.issueEstimate(issues[i]);
			console.log("  Estimate for isue " + issues[i].number + " = " + est);
			cell.innerHTML = est;
			incrementCount(sums, "Grand Total", labelItem, assigneeList, "totalEstimate", est, issues[i]);
		}
		
		// Remaining
		cell = row.insertCell();
		cell.style.textAlign = "right";
		if (issues[i].closed_at != null || (yoda.isLabelInIssue(issues[i], tentativeLabel))) {
			console.log("  Remaining for isue " + issues[i].number + " = 0");
			cell.innerHTML = "0";
		} else {
			var remaining = yoda.issueRemainingMeta(issues[i], yoda.issueEstimate(issues[i]), issues[i]);
			console.log("  Remaining for isue " + issues[i].number + " = " + remaining);
			cell.innerHTML = remaining;
			incrementCount(sums, "Grand Total", labelItem, assigneeList, "totalRemaining", remaining, issues[i]);
		}
		
		// # tasks
		cell = row.insertCell();
		cell.style.textAlign = "right";
		var noTasks = yoda.getbodyTasks(issues[i].body);
		incrementCount(sums, "Grand Total", labelItem, assigneeList, "totalTasks", noTasks, issues[i]);
		cell.innerHTML = noTasks;
		
		// # tasks completed
		cell = row.insertCell();
		cell.style.textAlign = "right";
		var noCompletedTasks = yoda.getbodyCompletedTasks(issues[i].body);
		incrementCount(sums, "Grand Total", labelItem, assigneeList, "totalCompletedTasks", noCompletedTasks, issues[i]);
		cell.innerHTML = noCompletedTasks;
		
		// Tentative
		cell = row.insertCell();
		cell.style.textAlign = "right";
		if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
			var remaining = yoda.issueRemaining(issues[i], yoda.issueEstimate(issues[i]));
			cell.innerHTML = remaining;
			incrementCount(sums, "Grand Total", labelItem, assigneeList, "totalTentative", remaining, issues[i]);
			console.log("For tentative issue: " + issues[i].number + " added remaining: " + remaining);
		} else {
			cell.innerHTML = "0";
		}
		
		cell = row.insertCell();
		if (issues[i].closed_at != null) {
			cell.innerHTML = "closed";
		} else {
			if (yoda.isLabelInIssue(issues[i], inprogressLabel)) {
				cell.innerHTML = "<b>open</b>";
			} else {
				cell.innerHTML = "open";
			}
		}
	}
	
	insertTotalsRow(bodyRef, sums, "Grand Total", "<b>Grand Total</b>", "", "", "", "");
	insertTotalsRow(bodyRef, sums, "Grand Total", "<i>Subtotal</i>", "open", "", "", "", "open");
	insertTotalsRow(bodyRef, sums, "Grand Total", "<i>Subtotal</i>", "closed", "", "", "", "closed");
	insertTotalsRow(bodyRef, sums, "Grand Total", "<i>Subtotal</i>", "In progress", "", "", "", "inprogress");

	// Spkit by labels 
	if (labels.length > 0) {
		insertBlankRow(bodyRef);
		insertBlankRow(bodyRef, "<b>Label subtotals</b>");
	}
	for (var l = 0; l < labels.length; l++) {
		insertTotalsRow(bodyRef, sums, labels[l], "<i>Subtotal</i>", "", "", labels[l], "");
		
		insertTotalsRow(bodyRef, sums, labels[l], "<i>Subtotal</i>", "open", "", "", "", "open");
		insertTotalsRow(bodyRef, sums, labels[l], "<i>Subtotal</i>", "closed", "", "", "", "closed");
		insertTotalsRow(bodyRef, sums, labels[l], "<i>Subtotal</i>", "In progress", "", "", "", "inprogress");
		insertBlankRow(bodyRef);
	}
	
	insertBlankRow(bodyRef, "<b>Assignee subtotals</b>");
	assigneeSet.forEach(function(assignee) {
		if (assignee != "unassigned") {
			var assigneeLink = '<a href="' + yoda.getGithubUrlHtml() + 'issues?q= is:issue assignee:' + assignee + ' milestone:&quot;' + $("#milestonelist").val() +'&quot;" target="_blank">' + assignee + '</a>';
			insertTotalsRow(bodyRef, sums, assignee, "<i>Subtotal</i>", assigneeLink, "", "", "");
		} else {
			insertTotalsRow(bodyRef, sums, assignee, "<i>Subtotal</i>", assignee, "", "", "");
		}
	});
	
	yoda.updateUrl(getUrlParams() + "&draw=table");
}

function isWorkDay(date, nonWorkDays) {
	if (nonWorkDays.includes(yoda.formatDate(date)) || date.getDay() >= 5) {
		return false;
	} else {
		return true;
	}
}

// ---------------------------------------
// Milestone issues have been retrieved. Time to analyse data and draw the chart.
function burndown(issues) {
	clearAreas();
	
	console.log("Creating burndown. No of issues retrieved: " + issues.length);
	yoda.filterPullRequests(issues);
	console.log("Creating burndown. No issues (after filtering out pull requests): " + issues.length);
	
	var nonWorkDays = $("#non_work_days").val();

	var tentativeLabel = $("#tentative").val();

	// 3 arrays we will create. 
	// Labels (x axis - days)
	var labels = [];
	// Remaining array are values for the bar chart. 
	var remainingArray = [];
	var remainingTentativeArray = [];
	var barColorArray = [];
	barColorArray.push('rgba(0,51,153,0.6)');
	
	// Data for the ideal line. This will actually only hold initial and final value, rest will be NaN.
	// Tool will draw a straight line between these two points.
	var remainingIdealArray = [];

	// sort issues by closed_date
	issues.sort(yoda.SortDates);
	
	// Will hold total estimate (sum of > estimate, or # of issues)
	var estimate = 0;
	var estimateTentative = 0;
	
	// Work on dates
	var milestoneStartdateString = $("#milestone_start").val();
	console.log("Milestone start date: " + milestoneStartdateString);
	var milestoneStartdate = new Date(milestoneStartdateString);
	
	var milestoneDuedateString = $("#milestone_due").val();
	console.log("Milestone due date: " + milestoneDuedateString);

	// Start starts at milestone start
	var date = new Date(milestoneStartdateString);

	var dueDate = new Date(milestoneDuedateString);
	// Add one to dueDate to ensure that we show entire sprint effort (as burndown is only shown the day after)
	dueDate.setDate(dueDate.getDate() + 1);
	console.log(milestoneDuedateString);
	
	var nextDay = new Date(date);
	var today = new Date();
	var todayString = yoda.formatDate(today);

	var tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	var tomorrowString = yoda.formatDate(tomorrow);

	// First calculate the sum of (either # of sum of estimates) of all issues associated with the
	// milestone
	for (i = 0; i < issues.length; i++) {
		var closedAt = new Date(issues[i].closed_at);
		if (issues[i].state == "closed" && closedAt < milestoneStartdate) {
			// Issue was already been closed BEFORE the milestone start date.
			// Issue (estimate or count) will NOT be included.
			// NOTE: This can be debated. Issue is after all in the milestone...
		}  else {
			var issueEstimateValue = yoda.issueEstimateBeforeDate(issues[i], yoda.formatDate(milestoneStartdate));  

			if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
				console.log(" => adding TENTATIVE : " + issues[i].number + ", estimate: " + issueEstimateValue);
				estimateTentative = estimateTentative + issueEstimateValue;
			} else {
				console.log(" => adding: " + issues[i].number + ", estimate: " + issueEstimateValue);
				estimate = estimate + issueEstimateValue;
			}
		}
	}
	console.log("Total estimate: " + estimate + ", Total tentative: " + estimateTentative);
	
	
	// Start remaining at estimate, then decrease as issues are closed.
	var remaining = estimate;
	var remainingTentative = estimateTentative;
	
	var burndownDateIndex = -1;

	// Now, run from milestone_startdate to milestone_duedate one day at a time...
	// HACK1: We are running on purpose one day extra, in order to show the effects of burndown on the last day.
	// HACK2: In the end we will push the labels one day to the right, thus causing burndown to take effort ON the day (before it was after).
	console.log(milestoneStartdate);

	// count work days
	var workDays = 0;
	var dateTmp = new Date(date);
	for (; dateTmp < dueDate; dateTmp.setDate(dateTmp.getDate() + 1)) {
		if (isWorkDay(dateTmp, nonWorkDays)) {
			workDays++;
		}
	}
	var pointDeltaPerWorkDay = estimate / (workDays - 1);
	var remainingWorkDayPoints = estimate;

	for (; date <= dueDate; date.setDate(date.getDate() + 1)) {
		console.log("Date: " + date);
		nextDay.setDate(date.getDate() + 1);

		var dateString = yoda.formatDate(date);
		
		// Burndown due date? If so, set index.
		console.log("dateString: " + dateString + ", burndown_due: " + $("#burndown_due").val());
		if (dateString == $("#burndown_due").val())
			burndownDateIndex = labels.length; 

		labels.push(dateString);
		if (remainingWorkDayPoints < 0) {
			remainingIdealArray.push(NaN);
		} else {
			remainingIdealArray.push(remainingWorkDayPoints);
		}

		if (isWorkDay(date, nonWorkDays)) {
			remainingWorkDayPoints -= pointDeltaPerWorkDay;
		}

		// Make bar for day, but not if later than current date!
		// BUT, we must have at least one entry if looking at a future sprint!
		if (date <= tomorrow || remainingArray.length == 0) {
			console.log("Adding bar value for: " + dateString + ", value: " + remaining);
			remainingArray.push(yoda.strip2Digits(remaining));
			remainingTentativeArray.push(yoda.strip2Digits(remainingTentative));
			if (isWorkDay(date, nonWorkDays)) {
				barColorArray.push('rgba(0,51,153,0.6)');
			} else {
				barColorArray.push('rgba(223,223,223,0.6)');
			}
		} else {
			console.log("Skipping bar as in future: " + dateString);
			remainingArray.push(NaN);
			remainingTentativeArray.push(NaN);
			barColorArray.push('rgba(0,51,153,0.6)');
		}

		// Now check which (if any) issues where closed during this day. Decrease remaining.
		for (i=0; i<issues.length; i++) {
			if (issues[i].closed_at != null) {
				var closedAt = new Date(issues[i].closed_at);
				if (date < closedAt && closedAt < nextDay) {
					if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
						console.log("Tentative Issue " + issues[i].number + " was closed: " + closedAt);
//						remainingTentative -= yoda.issueEstimate(issues[i]);
						remainingTentative -= yoda.issueEstimateBeforeDate(issues[i], yoda.formatDate(milestoneStartdate)); 
					} else {
						console.log("Issue " + issues[i].number + " was closed: " + closedAt);
//						remaining -= yoda.issueEstimate(issues[i]);
						remaining -= yoda.issueEstimateBeforeDate(issues[i], yoda.formatDate(milestoneStartdate)); 
					}
				}
			}
		}
	}
	
	// Now for the - really - complex bit, namely handling of "> remaining (date) (number)" syntax
	if (yoda.getEstimateInIssues() == "inbody") {
		for (i = 0; i < issues.length; i++) {
			// First, let's get the estimate at start
			var issueEstimate = yoda.issueEstimateBeforeDate(issues[i], yoda.formatDate(milestoneStartdate));
			if (issueEstimate != null) {
				var issueWorkDoneBefore = 0;
				for (var index = 0; yoda.getFirstRemaining(issues[i].body, index) != null; index++) {
					var remainingEntry = yoda.getFirstRemaining(issues[i].body, index);
					//      Ok, we now have a /remaining entry
					var remainingDate = remainingEntry.slice(0, 10);
					var remainingNumber = remainingEntry.slice(11);
					console.log("Remaining entry (" + index + ") for issue: " + issues[i].number + ": " + remainingDate + ", " + remainingNumber);

					if (issues[i].closed_at == null) {
						var closedAtString = null;
					} else {
						closedAtString = yoda.formatDate(new Date(issues[i].closed_at));
					}
					
					
					// We also need to know if the issue has been closed. If so, we should only adjust up to the point of
					// closure. The graph already has the effect of the closure (going to 0).
					for (var d = 0; d < labels.length; d++) {
						if (remainingDate == labels[d]) {
							console.log(" XXXXX " + labels[d] + ", remaining: " + remainingArray[d]);
							// Loop for future estimates, but only until either closed date (if issue was closed OR current date).
							for (var e = d + 1; e < labels.length; e++) {
								if (closedAtString != null && labels[e] > closedAtString) 
									continue;
								
								if (labels[e] > tomorrowString)
									continue;
								
								var delta = (issueEstimate - remainingNumber - issueWorkDoneBefore);
								console.log("Delta = " + delta);

								console.log(" YYYY " + labels[e] + ", remaining: " + remainingArray[e]);
								if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
									remainingTentativeArray[e] -= delta;
									// Precisionfix.
									remainingTentativeArray[e] = yoda.strip2Digits(remainingTentativeArray[e]);
								} else {
									remainingArray[e] -= delta;                                                
									remainingArray[e] = yoda.strip2Digits(remainingArray[e]);
								}
							}
							issueWorkDoneBefore = issueEstimate - remainingNumber;
						}
					}
				}
			}
		}
	}

	// HACK3: Let's hack the labels. We will remove the last one and insert an empty label to start.
	labels.splice(-1);
	labels.unshift("Estimate");

	// remaining_ideal_array needs some values. The start point for the ideal line will either
	// start at the total estimate OR overridden by the capacity field (which in turn may have 
	// been retrieved from the milestone description field).
	if ($("#capacity").val() != "") {
		remainingIdealArray[0] = parseInt($("#capacity").val());
	} else {
		remainingIdealArray[0] = estimate;
	}
	if (burndownDateIndex != -1) {
		remainingIdealArray[burndownDateIndex] = 0;
	} else {
		// Burndown to second to last day
		if (remainingIdealArray.length - 2 > 0) {
			remainingIdealArray[remainingIdealArray.length - 2] = 0;
		} else {
			remainingIdealArray[remainingIdealArray.length - 1] = 0;
		}
	}


//	console.log("Length of remainingArray: " + remainingArray.length);
	
	// -----------------------------------------------------------
	// READY - Draw the chart
	var chartData = {
			labels : labels,
			datasets : [ {
				type : 'bar',
				label : 'Burndown',
				borderWidth : 2,
				fill : false,
				data : remainingArray,
				backgroundColor : barColorArray
			},
			{
				type : 'line',
				label : 'Ideal',
				borderWidth : 2,
				fill : false,
				data : remainingIdealArray,
				borderColor: '#001a4d',
				pointRadius: 0,
				spanGaps: true
			}]
	};
	
	// If there were tentative data, need to add extra data series
	if (estimateTentative > 0) {
		chartData.datasets.push({
			type : 'bar',
			label : 'Tentative',
			borderWidth : 2,
			fill : false,
			data : remainingTentativeArray,
			backgroundColor : 'rgb(255, 255, 51)'  // Yellow
		});
	}

	// Axis legend depend on whether working from estimates in issues, or simply number of issues.
	var axis = "";
	if (yoda.getEstimateInIssues() == "noissues") {
		axis = "# of issues";
	} else {
		axis = "Story points";
	}
	
	// Chart title
	var titleText = "Burndown chart for ";
	if ($("#milestonelist").val() != "") 
		titleText +=  $("#owner").val() + "/" + $("#repolist").val() + " for milestone " + $("#milestonelist").val();

	var ctx = document.getElementById("canvas").getContext("2d");
	window.myMixedChart = new Chart(ctx, {
		type : 'bar',	
		data : chartData,
		options : {
			responsive : true,
			title : {
				display : true,
				text : titleText
			},
			tooltips : {
				mode : 'index',
				intersect : true
			},
			scales: {
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: axis
					},
					stacked: true,
					ticks: {
						beginAtZero: true
					}
				
				}],
				xAxes: [{
					barPercentage: 1,
					categoryPercentage: 1,
					stacked: true
				}]
			},
			tooltips: {
				enabled: false
			},
			elements: {
				line: {
					tension: 0 // disable bezier curves
				}
			}
		},
	});
	
	yoda.updateUrl(getUrlParams() + "&draw=chart");
}

// ------------------


function clearAreas() {
	clearTable();
	clearRN();
	// Destroy old graph, if any
	if (window.myMixedChart != null)
		window.myMixedChart.destroy();
}

function clearFields() {
	$("#milestonelist").empty();
	$("#milestone_start").val("");
	$("#milestone_due").val("");
	$("#capacity").val("");
	clearAreas();
}

// ------------------

function storeMilestones(milestones, repoIndex) {
	repoMilestones[repoIndex] = milestones;
	updateMilestones(repoIndex + 1);
}

var firstMilestoneShow = true;
function updateMilestones(repoIndex) {
	if (repoIndex == undefined) {
		// Clear milestone data
		repoIndex = 0;
		repoMilestones = []; 
		commonMilestones = [];
		
	}
	
	if (repoIndex < repoList.length) {
		if ($('#closedmilestones').is(":checked")) {
			var getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[repoIndex] + "/milestones?state=all";
		} else {
			var getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[repoIndex] + "/milestones?state=open";
		}

		console.log("Milestone get URL: " + getMilestonesUrl);
		
		yoda.getLoop(getMilestonesUrl, 1, [], function(data) {storeMilestones(data, repoIndex);}, null);
	} else {
		console.log("Read all milestones:");
		console.log(repoMilestones);
		
		// Done getting milestones for all selected repos
		// Next, find common milestones and update milestones selector.
		$("#milestonelist").empty();
		commonMilestones = [];
		
		for (var r = 0; r < repoList.length; r++) {
			for (var m = 0; m < repoMilestones[r].length; m++) {
				var repoTitle = repoMilestones[r][m].title;
				
				if (commonMilestones.indexOf(repoTitle) == -1) {
					commonMilestones.push(repoTitle);
				}
			}
		}
		
		// Sort and add. If URL argument has specified the milestone, select it.
		commonMilestones.sort();
		console.log("The common milestones are: " + commonMilestones);
		var milestonesSelected = false;
		
		console.log("URL milestone: " + yoda.decodeUrlParam(null, "milestone"));
		for (var c = 0; c < commonMilestones.length; c++) {
			var selectMilestone = false;
			if (firstMilestoneShow && commonMilestones[c] == yoda.decodeUrlParam(null, "milestone")) { 
				selectMilestone = true;
				milestonesSelected = true;
			}

			var newOption = new Option(commonMilestones[c], commonMilestones[c], selectMilestone, selectMilestone);
			$('#milestonelist').append(newOption);
		}
		
		//if (milestonesSelected)
			$('#milestonelist').trigger('change');
		
		firstMilestoneShow = false;
	}
}

// ------------

// Helper function to build the list of all milestones to query.
function addMilestoneFilter(repo) {
	// Need to find the milestone # for that repo
	console.log("Searching milestone definition for " + repo);

	for (var r = 0; r < repoList.length; r++) {
		if (repoList[r] != repo)
			continue;
		
		// Need to find the milestone (the number)..
		for (var m = 0; m < repoMilestones[r].length; m++) {
			console.log("Checking " + $("#milestonelist").val() + " against " + repoMilestones[r][m].title);
			if (repoMilestones[r][m].title == $("#milestonelist").val()) {
				var filter = "&milestone=" + repoMilestones[r][m].number;
				console.log("Adding to filter for repo: " + repo + ":" + filter);
				return filter;
			}
		}
	}
	// We did not find the milestone for this repo. It may not exist. In this case, we'll set an "impossible filter"
	return "&milestone=none&labels=im_pos_sible";
}

// ---------------

var firstMilestoneShowData = true;
function showMilestoneData() {
	console.log("Updating milestone data.");
	$("#capacity").val("");
	
	var selected = $("#milestonelist").val();
	// First we have to find it all matching milestones within the list and add the capacity
	// Concering the dates,
	
	var totalCapacity = 0;
	
	// This is a bit tricky. We will look across all selected repos and consider matching milestones.
	// We will pick up any capacity value and add to a total. We will assume that dates are set 
	// equally, so will just pick up what is there.... Warnings could be another option... 
	for (var r = 0; r < repoList.length; r++) {
		for (var m = 0; m < repoMilestones[r].length; m++) {
			var title = repoMilestones[r][m].title;
			
			if (selected == title) {
				var milestone = repoMilestones[r][m];

				var milestoneDueOn = yoda.formatDate(new Date(milestone.due_on));
				console.log("  Milestone due: " + milestoneDueOn);
				$("#milestone_due").val(milestoneDueOn);
				var milestoneStartdate = yoda.getMilestoneStartdate(milestone.description);
				if (milestoneStartdate == null) {
					$("#milestone_start").val("2017-xx-xx");
					console.log("  Unable to read milestone startdate.");
				}  else {
					$("#milestone_start").val(milestoneStartdate);
					console.log("  Milestone start: " + milestoneStartdate);
				}
				// Override due date?
				var overrideDue = yoda.getMilestoneBurndownDuedate(milestone.description);
				if (overrideDue != null) {
					$("#burndown_due").val(overrideDue);
				} else {
					$("#burndown_due").val("");
				}

				var capacity = yoda.getMilestoneCapacity(milestone.description);
				if (capacity != null) {
					console.log("Adding capacity " + capacity + " from repo " + repoList[r]);
					totalCapacity += parseInt(capacity);
				}

				var nonWorkDays = yoda.getMilestoneNonWorkDays(milestone.description);
				if (nonWorkDays != null) {
					$("#non_work_days").val(nonWorkDays);
				} else {
					$("#non_work_days").val("");
				}
			}
		}
	}
	if (totalCapacity != 0) {
		$("#capacity").val(totalCapacity);
	}
	
	if (firstMilestoneShowData) {
		firstMilestoneShowData = false;
		
		if (yoda.decodeUrlParamBoolean(null, "draw") == "chart") {
			startBurndown();
		} else {
			if (yoda.decodeUrlParamBoolean(null, "draw") == "table") {
				startTable();
			} else {
				if (yoda.decodeUrlParamBoolean(null, "draw") == "rn") {
					startRN();
				} else {
					if (yoda.decodeUrlParamBoolean(null, "draw") == "rnknown") {
						startRNKnown();
					}
				}
			}
		}
	}
}

var entryRNId = 0;

// Parse RN markdown to HTML (if any)
function parseRNMarkdown(rnId) {
	var oldRN = document.getElementById("RN#" + rnId);
	if (oldRN == null) {
		console.log("Markdown update complete");
		yoda.showSnackbarOk("Succesfully generated Release Notes"); 
		return;
	}
		
	var markdownUrl = yoda.getGithubUrl() + "markdown";
	console.log("markdownUrl: " + markdownUrl);

	var urlData = {
			"text": oldRN.innerHTML
	};
	
	$.ajax({
		url: markdownUrl,
		type: 'POST',
		data: JSON.stringify(urlData),
		success: function(data) { document.getElementById("RN#" + rnId).innerHTML = data; },
		error: function() { yoda.showSnackbarError("Failed to translate Markdown"); },
		complete: function(jqXHR, textStatus) { parseRNMarkdown(rnId + 1); }
	});
}

// Create a List node to based on the given issue.
function formatIssueRN(issue) {
	var node = document.createElement("LI");
	
	var issueRNTStart = issue.body.indexOf('> RNT');
	if (issueRNTStart != -1) {
		var lineStart = issue.body.indexOf('\n', issueRNTStart) + 1;
		var lineEnd = issue.body.indexOf('\n', lineStart);
		if (lineEnd == -1)
			var line = issue.body.substr(lineStart);
		else
			var line = issue.body.substr(lineStart, lineEnd - lineStart - 1);
		var title = line;
	} else {
		var title = issue.title;
	}
	var repo = yoda.getUrlRepo(issue.repository_url);	
	var titleLine = title + " (" + repo + "#" + issue.number + ")";
	var textnode = document.createTextNode(titleLine);
	node.appendChild(textnode);
	
	var issueRNSearchStart = 0;
	if (issueRNTStart != -1)
		issueRNSearchStart = issueRNTStart + 1;
	var issueRNStart = issue.body.indexOf('> RN', issueRNSearchStart);
	if (issueRNStart != -1) {
		var entryRN = document.createElement("blockquote");

		// Set ID for blockquote element. This will be used later for markdown updates.
		// We will use a simple sequence number. Not so elegant, but hey...
		entryRN.setAttribute("id", "RN#" + entryRNId);
		entryRNId++;
	
		var lineStart = issue.body.indexOf('\n', issueRNStart) + 1;

		var lineAdded = false;
		do {
			var lineEnd = issue.body.indexOf('\n', lineStart);
			if (lineEnd == -1)
				var line = issue.body.substr(lineStart);
			else
				var line = issue.body.substr(lineStart, lineEnd - lineStart - 1);
			if (line.length == 0)
				break;
//			console.log("Line: " + line);
			
			// One line at a time.
			if (lineAdded) {
				var lineBreak = document.createElement('BR');
				entryRN.appendChild(lineBreak);
			}
			
			var t = document.createTextNode(line);
			entryRN.appendChild(t);
			lineAdded = true;

			node.appendChild(entryRN);
			if (lineEnd == -1)
				break;
			
			lineStart = lineEnd + 1;
		} while (true);
	}

	return node;
}

function makeRN(issues) {
	entryRNId = 0;
	clearAreas();
	var rn = document.getElementById("RN");
	
	var repoList = $("#repolist").val();
	
	// T2 - Enhancements|Added Features,T1 - Defect|Solved Issues
	var rnLabelTypes = $("#rnlabeltypes").val();
	var rnLabelTypesList = rnLabelTypes.split(",");
	
	// Skip label
	var rnSkipLabel = $("#rnskiplabel").val();
	
//  Will be something like...
//	var issueTypeList = ["T2 - Enhancement", "T1 - Defect"];
//	var issueTypeHeading = ["Added Features", "Solved Issues"];
	
	// Headline
	var node = document.createElement("H1");
	var textNode = document.createTextNode("Release Notes for " + $("#milestonelist").val());
	node.appendChild(textNode);
	rn.appendChild(node);
	
	for (var r = 0; r < repoList.length; r++) {
		var node = document.createElement("H2");
		var textNode = document.createTextNode("Changes for " + repoList[r]);
		node.appendChild(textNode);
		rn.appendChild(node);
		
		for (var t = 0; t < rnLabelTypesList.length; t++) {
			var node = document.createElement("H3");
			var textNode = document.createTextNode(rnLabelTypesList[t].split("|")[1]);
			node.appendChild(textNode);
			rn.appendChild(node);
			
			var listNode = document.createElement("UL");
			
			for (var i = 0; i < issues.length; i++) {
				// Match repo?.
				var repository = issues[i].repository_url.split("/").splice(-1); // Repo name is last element in the url
				if (repository != repoList[r])
					continue;
				
				// Match issue type (in label)
				if (!yoda.isLabelInIssue(issues[i], rnLabelTypesList[t].split("|")[0]))
					continue;
				
				// Should issue be skipped
				if (yoda.isLabelInIssue(issues[i], rnSkipLabel))
					continue;
				
				listNode.appendChild(formatIssueRN(issues[i]));
			}
			rn.appendChild(listNode);
		}
	}

	parseRNMarkdown(0);
	
	// Copy to clipboard
	copy_text("RN");
	yoda.updateUrl(getUrlParams() + "&draw=rn");
}

function makeRNKnown(issues) {
	entryRNId = 0;
	clearAreas();
	var rn = document.getElementById("RN");
	var repoList = $("#repolist").val();
	
	// Headline
	var node = document.createElement("H1");
	var textNode = document.createTextNode("Release Note - Known Issues");
	node.appendChild(textNode);
	rn.appendChild(node);
	
	for (var r = 0; r < repoList.length; r++) {
		var node = document.createElement("H2");
		var textNode = document.createTextNode("Known Issues for " + repoList[r]);
		node.appendChild(textNode);
		rn.appendChild(node);
		
		var listNode = document.createElement("UL");

		for (var i = 0; i < issues.length; i++) {
			// Match repo?.
			var repository = issues[i].repository_url.split("/").splice(-1); // Repo name is last element in the url
			if (repository != repoList[r])
				continue;

			listNode.appendChild(formatIssueRN(issues[i]));
		}
		rn.appendChild(listNode);
	}

	parseRNMarkdown(0);
	
	// Copy to clipboard
	copy_text("RN");
	yoda.updateUrl(getUrlParams() + "&draw=rnknown");
}

function copy_text(element) {
    //Before we copy, we are going to select the text.
    var text = document.getElementById(element);
    var selection = window.getSelection();
    selection.removeAllRanges();
    var range = document.createRange();
    range.selectNodeContents(text);

    selection.addRange(range);

    // Now that we've selected element, execute the copy command  
    try {  
        var successful = document.execCommand('copy');  
        var msg = successful ? 'successful' : 'unsuccessful';  
        console.log('Copy to clipboard command was ' + msg);  
      } catch(err) {  
        console.log('Oops, unable to copy to clipboard');  
      }

    // Remove selection. TBD: Remove, when copy works.
    // selection.removeAllRanges();
}

function issueRemainingUpdaterInternal(issues, issueIdx, todayString, finalFunc) {
	if (issueIdx >= issues.length) {
		finalFunc(issues);
	} else {
		[issueEstimate, issueRemaining] = yoda.getBodyEstimateAndRemainingEld(issues[issueIdx].body);
		
		var updateNeeded = false;
		
		if (issueEstimate != null && issueRemaining != null) {
			// check if we need to include/update the total estimate on the issue's title
			var res = issues[issueIdx].title.match(/^(.*)\[(\d[\d]*[\.]*[\d]*)\]\s*$/);
			if (res != null) {
				var prevEstimate = parseFloat(res[2]);
				if (prevEstimate != issueEstimate) {
					updateNeeded = true;
					issues[issueIdx].title = res[1].trim() + ' [' + issueEstimate + ']';
				}
			} else {
				updateNeeded = true;
				issues[issueIdx].title = issues[issueIdx].title.trim() + ' [' + issueEstimate + ']';
			}
			
			// look for the last '> remaining' entry
			res = issues[issueIdx].body.match(/(> remaining\s+(\d{4}-\d{2}-\d{2})\s+(\d[\d]*[\.]*[\d]*))\s*$/);
			if (res != null) {
				// found an entry
				var remainingEntryDateString = res[2];
				var remainingEntryPoints = parseFloat(res[3]);

				if (remainingEntryPoints != issueRemaining ) {
					//  the remaining number of points has changed
					updateNeeded = true;

					if (remainingEntryDateString != todayString) {
						// the last entry was already from today. Update it
						issues[issueIdx].body = issues[issueIdx].body + '\n> remaining ' + todayString + ' ' + issueRemaining;
					} else {
						// the last entry was not from today. Add a new entry
						issues[issueIdx].body = issues[issueIdx].body.substring(0, res.index) + '\> remaining ' + todayString + ' ' + issueRemaining;
					}
				}
			} else {
				// no entry found. Add a new entry
				updateNeeded = true;
				issues[issueIdx].body = issues[issueIdx].body + '\n\n> remaining ' + todayString + ' ' + issueRemaining;
			}
		} else {
			yoda.showSnackbarError("Error calculating estimates for issue '" + issues[issueIdx].title + "'", 3000);
		}
		
		if (updateNeeded) {
			// update title and body only
			var issueObj = {
				title: issues[issueIdx].title,
				body: issues[issueIdx].body
			};
			
			yoda.editGitHubIssue($("#owner").val(), $("#repolist").val()[0], issues[issueIdx].number, issueObj, function(response) {issueRemainingUpdaterInternal(issues, issueIdx + 1, todayString, finalFunc);}, function(errorText) { yoda.showSnackbarError("Error editing issue: " + errorText, 3000);});
		} else {
			issueRemainingUpdaterInternal(issues, issueIdx + 1, todayString, finalFunc);
		}
	}
	
}

function issueRemainingUpdater(issues) {
	var today = new Date();
	var todayString = yoda.formatDate(today);
	
	issueRemainingUpdaterInternal(issues, 0, todayString, burndown);
}

//-------------- START FUNCTIONS ---

function startBurndown() {
	console.log("Milestone based chart...");
	yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), "", "all", addMilestoneFilter, issueRemainingUpdater, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
}

function startTable() {
	console.log("Milestone based table...");
	yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), "", "all", addMilestoneFilter, makeTable, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
}

function startRN() {
	console.log("Make RN...");
	yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), "", "all", addMilestoneFilter, makeRN, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
}

function startRNKnown() {
	console.log("Make RN Known Issues...");
	console.log("rnknownlabel is: " + $("#rnknownlabel").val());
	var knownLabel = $("#rnknownlabel").val();
	yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), knownLabel, "open", null, makeRNKnown, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
}

//--------------

function githubAuth() {
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------

//Label drawing
Chart.plugins.register({
 afterDatasetsDraw: function(chartInstance, easing) {
     var ctx = chartInstance.chart.ctx;

     chartInstance.data.datasets.forEach(function (dataset, i) {
         var meta = chartInstance.getDatasetMeta(i);
         if (!meta.hidden && meta.type == 'bar') {
             meta.data.forEach(function(element, index) {
                 // Draw the text in black, with the specified font
                 ctx.fillStyle = 'rgb(0, 0, 0)';
                 ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize, Chart.defaults.global.defaultFontStyle, Chart.defaults.global.defaultFontFamily);

                 // Just naively convert to string for now
                 var dataString = dataset.data[index].toString();
                 
                 // skip 0 label
                 if (dataString != "0") { 

                	 // Make sure alignment settings are correct
                	 ctx.textAlign = 'center';
                	 ctx.textBaseline = 'middle';

                	 var padding = 5;
                	 var position = element.tooltipPosition();
                	 ctx.fillText(dataString, position.x, position.y + (Chart.defaults.global.defaultFontSize / 2) + padding);
                 }
             });
         }
     });
 }
});

var backgroundColor = 'white';
Chart.plugins.register({
 beforeDraw: function(c) {
     var ctx = c.chart.ctx;
     ctx.fillStyle = backgroundColor;
     ctx.fillRect(0, 0, c.chart.width, c.chart.height);
 }
});
