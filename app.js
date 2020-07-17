const express = require('express');
const cors = require('cors');
const async = require('async');
const fetch = require('node-fetch');
const bodyparser = require('body-parser');

const config = require('./config');

const app = express();

const port = process.env.PORT || 5000;

//Adding middleware
app.use(cors());
app.use(bodyparser.json({ extended: true }));

function fetchData(url) {
    return new Promise((resolve, reject) => {
        return fetch(url)
            .then(response => { resolve(response) })
    })
}

function convertArrayToObject(array) {
    const entries = new Map(array);
    let obj = Object.fromEntries(entries);
    return obj
}

function removeSpecialAndLineBreak(string) {
    // remove line breaks
    string.replace(/(\r\n|\n|\r)/gm, "")
    // remove special Characters
    var specialChars = [' ', '.', '\\-', '_', '(', ')'];
    var specialRegex = new RegExp('[' + specialChars.join('') + ']');
    let wordCount = string.trim().split(specialRegex);
    return wordCount
}

let task = async (url) => {
    try {
        return new Promise(async (resolve, reject) => {
            let response = await fetchData(url);
            let data = await response.text();
            let wordCount = removeSpecialAndLineBreak(data);
            // creating a obj e.g key -> word & value -> occurence
            let counts = {};
            wordCount.forEach(function (x) {
                if (x) {
                    counts[x] = (counts[x] || 0) + 1;
                }
            });
            // converting object into array
            let arr = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(el => el)
            arr.splice(10)
            let obj = convertArrayToObject(arr);
            let dictionary = [];

            async.eachOfSeries(Object.keys(obj), async word => {
                let apiKey = config.apiKey;
                let url = `https://dictionary.yandex.net/api/v1/dicservice.json/lookup?key=${apiKey}&lang=en-ru&text=${word}`
                let syno = await fetchData(url);
                let result = await syno.json()
                let synArr = [];
                let posArr = [];
                let tempObj = {};
                result.def.forEach(element => {
                    let synObj = element.tr.find(o => o.syn);
                    if (synObj && synObj.syn && synObj.syn.length != 0) {
                        synObj.syn.forEach(syn => {
                            let isExistsInsynArr = synArr.find(o => o == syn.text);
                            if (!isExistsInsynArr) {
                                synArr.push(syn.text);
                            }
                            let isExistsInPosArr = posArr.find(o => o == syn.pos);
                            if (!isExistsInPosArr) {
                                posArr.push(syn.pos);
                            }
                        })
                    }
                })

                tempObj[word] = {
                    occurrenceCount: obj[word],
                    synonyms: synArr.join() || 'NA',
                    pos: posArr.join() || 'NA'
                }
                dictionary.push(tempObj)
            }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(dictionary)
                }
            })
        })
    } catch { e } {
        reject(e);
    }
}


task('http://norvig.com/big.txt').then(data => console.log(data))
    .catch(err => console.log('Something went wrong...'))



app.listen(port, () => {
    console.log('Server started at port ' + port);
});
