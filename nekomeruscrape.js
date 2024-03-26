const puppeteer = require('puppeteer');
const fs = require("fs");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

if(process.argv.length < 3){
    console.log("Usage: node nekomeruscrape.js [link to chapter]");
    return
}

//framework from demo here:
//https://serpapi.com/blog/web-scraping-in-javascript-complete-tutorial-for-beginner/#web-scraping-with-javascript-and-puppeteer-tutorial
(async () => {
    try {

        // Launch the browser and open a new blank page
        const browser = await puppeteer.launch(); // add the following: { headless: false } if you want to have the script open a physical browser
        const page = await browser.newPage();
        let link = process.argv[2];
        // Navigate the page to a URL
        await page.goto(link);

        console.log("page reached, waiting for images to load");
        await page.waitForSelector('.c-viewer__comic');

        //waits 5 seconds before beginning scraping. This is to allow the many images to load to the page, which typically takes a bit.
        //This works in tandem with waitForSelector since there are multiple images with that class to wait for. Janky but it works.
        
        await sleep(5000);
        console.log("wait completed, gathering data"); 
    
        //class selector for div with child image element: 'c-viewer__comic'
        // Set screen size
        const issueSrcs = await page.evaluate(() => {

            const srcs = document.querySelectorAll(".c-viewer__comic");
            let imglinks = [];
            for(let i = 0; i < srcs.length; i++){
                let thing = srcs[i].innerHTML;
                let attempt = thing.substring(thing.search("src="));
                attempt = attempt.match("\".*\"");
                //this is dumb, but it IS getting the temp link to the image, so...
                attempt = attempt.toString().replaceAll("\"","").split(" ")[0];

                imglinks.push(attempt);
            }
            
            return imglinks;
        });
        //opens all the image links and writes them to png files. Not in a folder or anything so kinda messy, but it works.
        for (let i = 0; i < issueSrcs.length; i++) {
            const viewSource = await page.goto(issueSrcs[i]);
            fs.writeFile(`image_${i + 1}.png`, await viewSource.buffer(), () => console.log(`Image #${i + 1} downloaded`));
        }
    
        await browser.close();
    }catch(err){
        console.error(err);
    }
})();