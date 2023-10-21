// npm init -y          (initialize)
// npm install minimist (to read data off process.argv)
// npm i axios          (to download data off the internet.)
// npm i pdf-lib        (to write pdf)
// npm i jsdom          (to read downloaded data)
// npm i excel4node     (to create excel files)

// node CricInfoExtractor.js --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results --excel=WorldCup.csv --dataFolder=datalet minimist=require("minimist");
let minimist=require("minimist");
let axios=require("axios");
let jsdom=require("jsdom");
let excel=require("excel4node");
let pdf=require("pdf-lib");
let fs=require("fs");
let path=require("path");

let args=minimist(process.argv);


// download using axios
// Read  Using JSDOM
// Make Excel using excel4node
// make pdf using pdf-lib.

//Why we use axios?
//coz it makes http requests to the browser.
let responsePromise= axios.get(args.source); //this statement makes a promise to get the html of the source url feeded in it.

responsePromise.then(function(response){
   
    let html=response.data; //data is an object of the response received by the browser.(we receive a whole response from which we extract the data object. )
    let dom=new jsdom.JSDOM(html); 
    let document=dom.window.document;
    let title=document.title;

    let matches=[]; 
    let matchScoreDivs= document.querySelectorAll("div.match-score-block");//From the html we have got, we select all divs with "match-score-block" and make an array named matchinfodivs.
   
    //HTML DOM Tree: Match-score-block > matchscoredivs (array of match-score-block) > 

   for(let i=0;i<matchScoreDivs.length;i++){    //We iterate through every matchscorediv element 
    let match={};  //This is an object.
                  //All the match score, team name and scorespan are stored in match.(entityname)

   

    let nameps=matchScoreDivs[i].querySelectorAll("p.name"); //nameps stores all occurences of p.name in every element of matchScoreDivs
    match.t1=nameps[0].textContent;
    match.t2=nameps[1].textContent;

    let scorespan=matchScoreDivs[i].querySelectorAll("div.score-detail > span.score"); //scorespan stores all occurences of span.score in every element of matchScoreDivs

    
    //if both teams have batted, then scorespan.length=2
    //if 1 team has batted, the scorespan.length=1
    //if match is abandoned, then scorespan.length=0
    if(scorespan.length==2){
        match.t1s=scorespan[0].textContent;
        match.t2s=scorespan[1].textContent;

    } else if(scorespan.length==1){
        match.t1s=scorespan[0].textContent;
        match.t2s="";
    } else{
        match.t1s="";
        match.t2s="";
    }

    let spanResult=matchScoreDivs[i].querySelector("div.status-text > span"); //we use queryselector as we have only one element(the result), unlike others which have different values for all teams.

    match.result= spanResult.textContent;
    matches.push(match);
   }
   let matchesJSON = JSON.stringify(matches);
   fs.writeFileSync("matches.json", matchesJSON, "utf-8");
   let teams = [];
   for (let i = 0; i < matches.length; i++) {
       populateTeams(teams, matches[i]);
   }

   for (let i = 0; i < matches.length; i++) {
       populateMatches(teams, matches[i]);
   }

   let teamsJSON = JSON.stringify(teams);
   fs.writeFileSync("teams.json", teamsJSON, "utf-8");
   createExcelFile(teams);
   createFolders(teams, args.dataFolder);

}).catch(function(err){
    console.log(err);
})


function populateTeams(teams, match) {
    let team1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (match.t1 == teams[i].name) {
            team1idx = i;
            break;
        }
    }
    if (team1idx == -1) {
        let team = {
            name: match.t1,
            matches: []
        }
        teams.push(team);
    }

    let team2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (match.t2 == teams[i].name) {
            team2idx = i;
            break;
        }
    }
    if (team2idx == -1) {
        let team = {
            name: match.t2,
            matches: []
        }
        teams.push(team);
    }
}

function populateMatches(teams, match) {
    let team1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (match.t1 == teams[i].name) {
            team1idx = i;
            break;
        }
    }
    let team1 = teams[team1idx];
    let matchDetail1 = {
        opponent: match.t2,
        selfScore: match.t1s,
        opponentScore: match.t2s,
        result: match.result
    }
    team1.matches.push(matchDetail1);

    let team2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (match.t2 == teams[i].name) {
            team2idx = i;
            break;
        }
    }
    let team2 = teams[team2idx];
    let matchDetail2 = {
        opponent: match.t1,
        selfScore: match.t2s,
        opponentScore: match.t1s,
        result: match.result
    }
    team2.matches.push(matchDetail2);
}

function createExcelFile(teams) {
    let wb = new excel.Workbook();
    let style = wb.createStyle({
        font: {
            color: '#000000',
            size: 12,
            bold : true
        },
        numberFormat: '$#,##0.00; ($#,##0.00); -',
        fill: {
            type: "pattern",
            patternType: "solid",
            fgColor: "#FFA500"
        }
    });
    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name);
        sheet.cell(1, 1).string("Opponent").style(style);
        sheet.cell(1, 2).string("Self Score").style(style);
        sheet.cell(1, 3).string("Opponent Score").style(style);
        sheet.cell(1, 4).string("Result").style(style);

        for (let j = 0; j < teams[i].matches.length; j++) {
            sheet.cell(2 + j, 1).string(teams[i].matches[j].opponent);
            sheet.cell(2 + j, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(2 + j, 3).string(teams[i].matches[j].opponentScore);
            sheet.cell(2 + j, 4).string(teams[i].matches[j].result);
        }
    }
    wb.write(args.excel);
}


function createFolders(teams, dataFolder) {
    if (fs.existsSync(dataFolder) == true) {
        fs.rmdirSync(dataFolder, { recursive: true });
    }
    fs.mkdirSync(args.dataFolder);
    for (let i = 0; i < teams.length; i++) {
        let teamsFolder = path.join(args.dataFolder, teams[i].name);
        fs.mkdirSync(teamsFolder);
        for (let j = 0; j < teams[i].matches.length; j++) {
            let matchFileName = path.join(teamsFolder, teams[i].matches[j].opponent);
            createScoreCard(teams[i].name, teams[i].matches[j], matchFileName);
        }
    }
}

function createScoreCard(teamName, match, matchFileName) {
    let t1 = teamName;
    let t2 = match.opponent;
    let t1s = match.selfScore;
    let t2s = match.opponentScore;
    let result = match.result;

    let originalBytes = fs.readFileSync("Template.pdf");
    let pdfDocPrms = pdf.PDFDocument.load(originalBytes);
    pdfDocPrms.then(function (pdfDoc) {
        let page = pdfDoc.getPage(0);
        page.drawText(t1, {
            x: 430,
            y: 600,
            size: 16
        });
        page.drawText(t2, {
            x: 430,
            y: 500,
            size: 16
        });
        page.drawText(t1s, {
            x: 430,
            y: 450,
            size: 16
        });
        page.drawText(t2s, {
            x: 430,
            y: 380,
            size: 16
        });
        page.drawText(result, {
            x: 340,
            y: 300,
            size: 13
        });

        let pdfSavePrms = pdfDoc.save();
        pdfSavePrms.then(function (newBytes) {
            if (fs.existsSync(matchFileName + ".pdf") == true) {
                fs.writeFileSync(matchFileName + "(1).pdf", newBytes);
            } else {
                fs.writeFileSync(matchFileName + ".pdf", newBytes);
            }
        })
    })

}
