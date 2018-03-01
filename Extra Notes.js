extraHook = function(){
	goals.setGoal("oil",Math.floor(gamePage.resPool.get("oil").maxValue-7500));
	goals.setGoal("uranium",Math.floor(gamePage.resPool.get("uranium").maxValue-250));
	goals.setGoal("unobtainium",Math.floor(gamePage.resPool.get("unobtainium").maxValue-1000));
	goals.setGoal("steamworks",goals.res["magneto"].val);
	//goals.setGoal("observatory",goals.res["biolab"].val);
	gamePage.bld.getBuildingExt("biolab").meta.on=0;
	if(gamePage.calendar.festivalDays<=40000&&gamePage.resPool.get("manpower").value>=15000&&gamePage.resPool.get("culture").value>=50000&&gamePage.resPool.get("parchment").value>=25000){
		var btn=gamePage.villageTab.festivalBtn;
		btn.model.x10Link.handler(btn,callback=function(result){if(result)btn.update();});
		if(goals.getGoal("log")!=0)
			console.log("Extended festival for 10 years.");
	}
	if((gamePage.bld.getBuildingExt("aiCore").meta.effects["aiLevel"] || 0) >= goals.getGoal("aiLevel"))
		gamePage.space.getBuilding("entangler").on = gamePage.space.getBuilding("entangler").val;
	else
		gamePage.space.getBuilding("entangler").on = 0;
	if(getZebraTitaniumTrades() <= Math.floor(gamePage.resPool.get("manpower").maxValue / 50) && getZebraTitaniumTrades() >= 0)
		goals.setGoal("zebras6",-1 * getZebraTitaniumTrades());
	else if(goals.getGoal("zebras6")<0)
		goals.setGoal("zebras6",0);
	goals.setGoal("autoApoReset",parseInt(getReligionProductionBonusCap())-10);
	if(gamePage.resPool.get("catnip").perTickCached <= 5)
		autoClick(0,"bonfire");
}

makeNiceString = function(num, numDigits = 3){
	num = num.toFixed(numDigits);
	num = num.toString();
	var decimal = num.substr(num.indexOf("."));
	if(decimal == "." + Array(numDigits + 1).join("0"))
		num = num.substr(0,num.indexOf("."));
	for(var i = (num.indexOf(".") != -1 ? num.indexOf(".") - 3 : num.length - 3); i > 0; i -= 3)
		num = num.substr(0,i) + "," + num.substr(i);
	return num;
}

getCraftTime = function(resName,goal,log=false,returnString=true,numIndent=1){
	var res = gamePage.resPool.get(resName);
	var origIndent = new Array(numIndent).join("\t");
	var indent = new Array(numIndent+1).join("\t");
	var indeNt = "\n\t" + indent;
	if(res!=false){
		var resCraft = gamePage.workshop.getCraft(resName);
		if(resCraft == null){
			var income = gamePage.getResourcePerTick(resName,true) * gamePage.getRateUI();
			var whatsLeft = goal > res.value ? goal - res.value : 0;
			var timeLeft = whatsLeft / income;
			if(log){
				console.log(indent + resName + indeNt + "Needed: " + makeNiceString(goal) + indeNt + "To go: " + (whatsLeft != 0 ? makeNiceString(whatsLeft) : "Done")
				+ " | Time until goal: " + gamePage.toDisplaySeconds(timeLeft));
			}
			if(returnString)
				return gamePage.toDisplaySeconds(timeLeft);
			else
				return timeLeft;
		}
		else{
			if(log){
				console.log(origIndent + resName + "\n" + indent + "Needed: " + makeNiceString(goal) + "\n" + indent + "To go: " + (res.value < goal ? makeNiceString(goal - res.value) : "0"));
			}
			var prices = gamePage.workshop.getCraftPrice(resCraft);
			var numToCraft = goal - res.value;
			numToCraft /= 1 + gamePage.getResCraftRatio({name:resName});
			var longest = 0;
			if(numToCraft > 0){
				for(var i in prices){
					var priceVal = prices[i].val * numToCraft;
					var resPrice = gamePage.resPool.get(prices[i].name);
					var priceTime = 0;
					if(resPrice.value < priceVal){
						var timeToGo = getCraftTime(prices[i].name,priceVal - resPrice.value,log,false,numIndent+1);
						if(timeToGo > longest)
							longest = timeToGo;
					}
					else{
						if(log){
							console.log(indent + prices[i].name + indeNt + "Needed: " + makeNiceString(priceVal) + indeNt + "To go: Done | Time until goal: 0")
						}
					}
				}
			}
			if(returnString)
				return gamePage.toDisplaySeconds(longest);
			else
				return longest;
		}
	}
	else{
		if(returnString)
			return "Invalid resource name.";
		else
			return 0;
	}
}

getUraniumForThoriumReactors = function(){
	var needed = 250 * .1875 * gamePage.bld.getBuildingExt("reactor").meta.val;
	needed /= 1 + gamePage.getResCraftRatio({name:"thorium"});
	var actual = gamePage.resPool.get("uranium").perTickCached;
	actual += gamePage.getResourcePerTickConvertion("uranium");
	actual *= gamePage.getRateUI();
	var difference = needed > actual ? needed - actual : actual - needed;
	needed = Math.round(needed * 1000) / 1000;
	actual = Math.round(actual * 1000) / 1000;
	difference = Math.round(difference * 1000) / 1000;
	var change = needed > actual ? "\n To go: " : "\n Extra income: ";
	return "Current: " + actual + "\n Needed: " + needed + change + difference;
}

getBlueprintCraft = function(){//ALTERNATIVELY, just do 1 + gamePage.getResCraftRatio({name:"blueprint"});. This is just working through the formula again. Completely unnecessary.
	/*global ratio: gamePage.getCraftRatio()
	CAD ratio: (library + academy + observatory + biolab) * .01 // .01 is from gamePage.getEffect("cadBlueprintCraftRatio");
	blueprints are (global ratio + cad ratio + (Agrum? 25% | 0%) ) * (1 + (Agrum? 5% | 0%))*/
	var globalRatio = gamePage.getCraftRatio();
	var CADAmount = gamePage.bld.get("library").val + gamePage.bld.get("academy").val;
	CADAmount += gamePage.bld.get("observatory").val + gamePage.bld.get("biolab").val;
	var bpRatio = gamePage.getEffect("cadBlueprintCraftRatio");
	globalRatio += CADAmount * bpRatio;
	var bpCraftRatio = game.getEffect("blueprintCraftRatio") || 0;
	var finalResult = (globalRatio + bpCraftRatio);
	finalResult *= (1 + (gamePage.getEffect("blueprintGlobalCraftRatio") || 0));
	finalResult += 1;
	return finalResult; // How many blueprints you get per individual craft
}

getPraiseLoss = function(tier=-1,perc=-1){//tier as goal tier, perc as 100 for 100%. Returns how much is required, how much you'd have, how much you'd lose, and the % of the loss versus original.
	if(tier == -1)
		tier = gamePage.religion.getTranscendenceLevel() + 1;
	var tt=game.religion.getTranscendenceRatio(tier)-game.religion.getTranscendenceRatio(tier-1);
	if(perc == -1)
		perc = gamePage.religion.faithRatio / tt * 100;
	var before = Math.round(gamePage.religion.getTriValueReligion(tt * perc / 100) * 100);
	var after = Math.round(game.religion.getTriValueReligion(tt * (perc - 100) / 100) * 100);
	var loss = Math.round(before - after);
	var lossRatio = 100 * loss / before;
	var str = "To tier: ";
	str += tier;
	str += "\n Progress: ";
	str += makeNiceString(perc);
	str += "%\n Before: ";
	str += makeNiceString(before);
	str += "%\n After: ";
	str += makeNiceString(after);
	str += "%\n Loss: ";
	str += makeNiceString(loss);
	str += "%\n Loss ratio: ";
	str += makeNiceString(lossRatio);
	str += "%";
	return str;
}

getRelicTime = function(goal,log=false){//Time until enough relics for goal
	var relicsPerDay = game.getEffect("relicPerDay");
	var current = gamePage.resPool.get("relic").value;
	var secondsPerDay = 2;
	if(log)//If you wanted to see relics per second
		console.log("Relics per second income: " + (relicsPerDay / secondsPerDay));
	return game.toDisplaySeconds((goal-current) / relicsPerDay * secondsPerDay);
}

getMockParagon = function(ratio,cost){ // ratio is paragon boost% in decimal form by sephiroths, cost is how much the next one costs. % is given like .05 if you had Malkuth, a 5% bonus.
	var result = 20 * cost * (1 + ratio) + cost;//cost of the sephirot, ratio is the ratio before buying it (like .05 if you had Malkuth already)
	return result;
	//Chart of results at bottom
}

getParagonProd = function(preRatio,cost,log = false){//gets paragon production percent tipping point before/after buying a sephirot
	var step = Math.floor(cost / 2);
	if(step == 0)
		step = 1;
	var curVal = cost;
	var dir = 1;
	var before;
	var after;
	while(step > 0){
		before = gamePage.getHyperbolicEffect(curVal * .01 * (1 + preRatio), 1 + 2 * preRatio);
		after = gamePage.getHyperbolicEffect((curVal - cost) * .01 * (1 + preRatio + .05), 1 + 2 * (preRatio + .05));
		if(log)
			console.log("Step: " + step + "\ncurVal: " + curVal + "\ndir: " + dir + "\nbefore: " + before + "\nafter: " + after);
		if(after < before){
			curVal += step;
			if(dir == -1)
				step = Math.floor(step / 2);
			dir = 1;
		}
		else if(after > before){
			curVal -= step;
			if(dir == 1)
				step = Math.floor(step / 2);
			dir = -1;
		}
		else
			step = 0;
	}
	before = gamePage.getHyperbolicEffect(curVal * .01 * (1 + preRatio), 1 + 2 * preRatio);
	after = gamePage.getHyperbolicEffect((curVal - cost) * .01 * (1 + preRatio + .05), 1 + 2 * (preRatio + .05));
	while(after < before){
		curVal += 1;
		before = gamePage.getHyperbolicEffect(curVal * .01 * (1 + preRatio), 1 + 2 * preRatio);
		after = gamePage.getHyperbolicEffect((curVal - cost) * .01 * (1 + preRatio + .05), 1 + 2 * (preRatio + .05));
		if(log)
			console.log("Still under, stepping up.\ncurVal: " + curVal + "\nbefore: " + before + "\nafter: " + after);
	}
	return "Tipping point: " + curVal;
	//Chart of results at bottom
}

getNecrocornTime = function(log=false){//true to also output necrocorns per second
	var numAlicorns = gamePage.resPool.get("alicorn").value;
	var curCorruption = gamePage.religion.corruption;
	var corruptionRate = 1;
	if(gamePage.resPool.get("necrocorn").value > 0)
		corruptionRate = 0.25 * (1+ gamePage.getEffect("corruptionBoostRatio"));
	corruptionRate *= gamePage.getEffect("corruptionRatio");
	if(numAlicorns <= 0){
		curCorruption = 0;
		corruptionRate = 0;
	}
	if(log)
		console.log("Current corruption rate: " + (corruptionRate * gamePage.getRateUI()) + "/sec");
	return gamePage.toDisplaySeconds( (1 + corruptionRate - curCorruption) / (corruptionRate * gamePage.getRateUI()) );
}

getLeviChance = function(){//Odds of leviathans showing up per year
	var numPyramids = gamePage.religion.getZU("blackPyramid").val;
	var numMarkers = gamePage.religion.getZU("marker").val;
	var chance = 35 * numPyramids * (1 + 0.1 * numMarkers) / 10;
	return chance + "%";
}

getReligionProductionBonusCap = function(){
	var transcendTier = gamePage.religion.getTranscendenceLevel();
	var numObelisks = gamePage.religion.getTU("blackObelisk").val;
	var result = 1000 * (transcendTier * numObelisks * .005 + 1);
	return result + "%";
}

getPrices = function(bldName,bldType = undefined){
	var prices = [];
	var bld = undefined;
	var type = bldType;
	for(var i in gamePage.religion.zigguratUpgrades)//ziggurat unicorn buildings
		if(gamePage.religion.zigguratUpgrades[i].name == bldName){
			bld = gamePage.religion.zigguratUpgrades[i];
			type = "ziggurat";
		}
	if(!bld || bldType == "religion")
		for(var i in gamePage.religion.religionUpgrades)//religious upgrades
			if(gamePage.religion.religionUpgrades[i].name == bldName){
				bld = gamePage.religion.religionUpgrades[i];
				type = "religion";
			}
	if(!bld || bldType == "transcend")
		for(var i in gamePage.religion.transcendenceUpgrades)//cryptotheology
			if(gamePage.religion.transcendenceUpgrades[i].name == bldName){
				bld = gamePage.religion.transcendenceUpgrades[i];
				type = "transcend";
			}
	if(!bld || bldType == "space")//space
		for(var i in gamePage.space.meta)
			for(var j in gamePage.space.meta[i].meta)
				if(gamePage.space.meta[i].meta[j].name == bldName){
					bld = gamePage.space.meta[i].meta[j];
					type = "space";
				}
	if(!bld || bldType == "workshop")//workshop
		for(var i in gamePage.workshop.meta[0].meta)
			if(gamePage.workshop.meta[0].meta[i].name == bldName){
				bld = gamePage.workshop.meta[0].meta[i];
				type = "workshop";
			}
	if(!bld || bldType == "craft")//crafts
		if(gamePage.workshop.getCraft(bldName)){
			bld = gamePage.workshop.getCraft(bldName);
			type = "craft";
		}
	if(!bld || bldType == "time")//time
		for(var i in gamePage.time.meta)
			for(var j in gamePage.time.meta[i].meta)
				if(gamePage.time.meta[i].meta[j].name == bldName){
					bld = gamePage.time.meta[i].meta[j];
					type = "time";
				}
	if(!bld || bldType == "metaphysics")//metaphysics
		for(var i in gamePage.prestige.meta[0].meta)
			if(gamePage.prestige.meta[0].meta[i].name == bldName){
				bld = gamePage.prestige.meta[0].meta[i];
				type = "metaphysics";
			}
	if(!bld || bldType == "science")//science
		for(var i in gamePage.science.metaCache)
			if(gamePage.science.metaCache[i].name == bldName){
				bld = gamePage.science.metaCache[i];
				type = "science";
			}
	if(!bld || bldType == "trade")//trade
		for(var i in gamePage.diplomacy.races)
			if(gamePage.diplomacy.races[i].name == bldName){
				bld = gamePage.diplomacy.races[i];
				type = "trade";
			}
	if(!bld || bldType == "building")//bonfire buildings
		if(gamePage.bld.getBuildingExt(bldName)){
			prices = gamePage.bld.getPricesWithAccessor(gamePage.bld.getBuildingExt(bldName));
			for(var i in prices)
				prices[i].displayVal = gamePage.getDisplayValueExt(prices[i].val);
			return prices;
		}
	if(bld){
		for (var i = 0; i< (bld.prices ? bld.prices.length : bld.buys.length); i++){
			prices.push({
				val: (bld.prices? bld.prices[i].val : bld.buys[i].val) * Math.pow(bld.priceRatio || 1, bld.val || bld.value || 0),
				name: (bld.prices? bld.prices[i].name : bld.buys[i].name)
			});
		}
	}
	if(type == "science" || type == "workshop")
		prices = gamePage.village.getEffectLeader("scientist", prices);
	if(type == "religion")
		prices = gamePage.village.getEffectLeader("wise", prices);
	if(type == "trade"){
		var tempPrices = [];
		for(var i in prices)
			tempPrices.push(prices[i]);
		prices = [];
		prices.push({val: 50, name: "manpower"});
		prices.push({val: 15, name: "gold"});
		for(var i in tempPrices)
			prices.push(tempPrices[i]);
	}
	for(var i in prices)
		prices[i].displayVal = gamePage.getDisplayValueExt(prices[i].val);
	return prices;
}

getCelestialEventChance = function(){
	var chanceRatio = 1;//calculating chance ratio for daily events
	if(gamePage.prestige.getPerk("chronomancy").researched)
		chanceRatio = 1.1;
	chanceRatio *= gamePage.getEffect("timeRatio") * .25 + 1;
	
	var chance = 25;//calculating chance of celestial events per day
	chance += gamePage.getEffect("starEventChance") * 10000;
	chance *= chanceRatio;
	if(gamePage.prestige.getPerk("astromancy").researched)
		chance *= 2;
	if(gamePage.bld.get("library").on <= 0)
		chance = 0;
	chance /= 100;//10,000 * 100% to bring it to percentages
	
	var autoChance = gamePage.getEffect("starAutoSuccessChance") * 100;//Auto-success chance
	if(gamePage.prestige.getPerk("astromancy").researched)
		autoChance *= 2;
	if(gamePage.ironWill && autoChance < 25)
		autoChance = 25;
	if(gamePage.workshop.get("seti").researched && autoChance < 100)
		autoChance = 100;
	
	var str = "Chance of celestial event per day: " + chance + "%\n ";
	str += "Chance for auto-success of event: " + autoChance + "%";
	return str;
}

getZebraTitaniumTrades = function(log = false){
	var titaniumPerTrade = gamePage.resPool.get("ship").value / 100 * 1.5 * 2 + 1.5;
	var maxTitanium = gamePage.resPool.get("titanium").maxValue;
	if(maxTitanium == 0)
		maxTitanium = Infinity;
	if(log)
		console.log("Titanium per Zebra trade: " + titaniumPerTrade);
	var maxNumTrades = maxTitanium / titaniumPerTrade;
	if(log)
		console.log("Trades to fill titanium cap from zero: " + Math.ceil(maxNumTrades));
	var numTrades = maxTitanium - gamePage.resPool.get("titanium").value;
	numTrades /= titaniumPerTrade;
	if(log)
		console.log("Number of zebra trades to fill titanium: " + Math.ceil(numTrades));
	return Math.ceil(numTrades);
}

getTCPerSacrifice = function(log = false){
	var numTCPerSacrifice = 1;
	numTCPerSacrifice += gamePage.getEffect("tcRefineRatio");
	if(log){
		console.log("TC from sacrifice all: " + (numTCPerSacrifice * Math.floor(gamePage.resPool.get("alicorn").value / 25)));
	}
	return numTCPerSacrifice;
}

getParagonProductionBonus = function(amount = -1, burnedAmount = -1, numSephirots = -1){
	var percentBoost = 1.0 + numSephirots * .05;
	if(numSephirots == -1)
		percentBoost = 1.0 + gamePage.getEffect("paragonRatio");
	if(amount == -1)
		amount = gamePage.resPool.get("paragon").value;
	if(burnedAmount == -1)
		burnedAmount = gamePage.resPool.get("burnedParagon").value;
	
	var darkFutureYears = gamePage.calendar.year - 40000;
	
	var productionRatioParagon = (amount * 0.010) * percentBoost;
	productionRatioParagon = gamePage.getHyperbolicEffect(productionRatioParagon, 2 * percentBoost);

	var ratio = darkFutureYears >= 0 ? 4 : 1;
	var productionRatioBurnedParagon = burnedAmount * 0.010 * percentBoost;
	productionRatioBurnedParagon = gamePage.getHyperbolicEffect(productionRatioBurnedParagon, ratio * percentBoost);

	return 100 * (productionRatioParagon + productionRatioBurnedParagon);
}

generateTable = function(func, params, steps, numSteps){
	if(func.name != this.name){
		var STRIP_COMMENTS = /(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\s*=[^,\)]*(('(?:\\'|[^'\r\n])*')|("(?:\\"|[^"\r\n])*"))|(\s*=[^,\)]*))/mg;
		var ARGUMENT_NAMES = /([^\s,]+)/g;
		var fnStr = func.toString().replace(STRIP_COMMENTS, '');
		var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
		if(result === null)
			result = [];
		
		var vals = [];
		for(var i in params)
			vals[i] = params[i];
		
		result[result.length] = "Output";
		
		var finalized = [result];
		
		for(var i = 0; i <= numSteps; i++){
			finalized[finalized.length] = [];
			for(var j in vals)
				finalized[finalized.length - 1][j] = vals[j];
			var output = func.apply(this, vals);
			finalized[finalized.length - 1][finalized[finalized.length - 1].length] = output;
			for(var j in steps){
				if(steps[j] && steps[j] != 0)
					vals[j] += steps[j];
			}
		}
		return finalized;
	}
}

formatTable = function(table, headerNames = [], suffixes = [], wikiFormat = false){
	var maxLengths = [];
	for(var row in table){
		for(var col in table[row]){
			var length = 0;
			if(headerNames[col] && row == 0)
				table[row][col] = headerNames[col];
			var data = table[row][col];
			if(typeof(data) == "number")
				data = makeNiceString(data);
			data = data.toString();
			if(suffixes[col] && row > 0)
				data += suffixes[col];
			length = data.length;
			if(maxLengths[col]){
				if(maxLengths[col] <= length)
					maxLengths[col] = length + 1;
			}
			else
				maxLengths[col] = length + 1;				
		}
	}
	if(!wikiFormat){
		var output = "/";
		for(var i in maxLengths)
			output += Array(maxLengths[i] + 2).join("-");
		output = output.slice(0, -1) + "\\";
		for(var row in table){
			output += "\n |";
			for(var col in table[row]){
				var data = table[row][col];
				if(typeof(data) == "number")
					data = makeNiceString(data);
				data = data.toString();
				if(suffixes[col] && row > 0)
					data += suffixes[col];
				output += (Array(maxLengths[col] + 1).join(" ") + data).slice(-1 * maxLengths[col]) + "|";
			}
		}
		output += "\n \\";
		for(var i in maxLengths)
			output += Array(maxLengths[i] + 2).join("-");
		output = output.slice(0, -1) + "/";
		return output;
	}
	var output = "";
	for(var row in table){
		if(output != "")
			output += "\n";
		output += "|";
		for(var col in table[row]){
			if(typeof(table[row][col]) == "number")
				output += "r {{" + (Array(maxLengths[col] + 1).join(" ") + makeNiceString(table[row][col]) + (suffixes[col]? suffixes[col] : "")).slice(-1 * maxLengths[col]) + "}}|";
			else
				output += (Array(maxLengths[col] + 1 + 6).join(" ") + table[row][col]).slice(-1 * maxLengths[col] - 6) + "|";
		}
	}
	return output;
}

//===========================================================================================
//AutoXML
//===========================================================================================

makeAutoXml = function(log = false){
	var techs = gamePage.science.techs;
	var resultString = "";
	for(var i in techs){
		if(log)
			console.log(techs[i].name);
		if(i!=0)
			resultString += "\n";
		var thisTech = "";
		thisTech += techs[i].name;
		thisTech += "|" + techs[i].label;
		thisTech += "*Prices"
		for(var j in techs[i].prices)
			thisTech += "|" + techs[i].prices[j].name + "-" + techs[i].prices[j].val;
		thisTech += "&Children";
		if(techs[i].unlocks){
			if(techs[i].unlocks.tech){
				thisTech += "*techs";
				for(var j in techs[i].unlocks.tech)
					thisTech += "|" + techs[i].unlocks.tech[j];
			}
		}
		resultString += thisTech;
	}
	return resultString;
}

//===========================================================================================
//WikiCookies
//===========================================================================================

addCookieRes = function(){
	var cookie = {//res
		name: "cookie",
		title: "WikiCookie",
		type: "rare",
		visible: true,
		calculatePerTick: false,
		aiCanDestroy: false,
		craftable: false,
		transient: true,
		persists: true,
		value: 1,
		unlocked: true,
		refundable: false
	};
	gamePage.resPool.resources.push(cookie);
	gamePage.resPool.resourceMap["cookie"] = cookie;
	gamePage.console.filters["cookie"] = {//console
		title: "WikiCookies",
		enabled: true,
		unlocked: false
	};
	for(var i in gamePage.bld.buildingGroups)//buildings
		if(gamePage.bld.buildingGroups[i].name == "other")
			gamePage.bld.buildingGroups[i].buildings.push("chatroom");
	gamePage.bld.cookieProgress = 0;
	gamePage.bld.buildingsData.push({
		name: "chatroom",
		label: "IRC Catroom",
		description: "Allowing kittens to talk to each other using the Internet Relay Cat",
		unlockRatio: 0.3,
		unlockable: true,
		prices: [
			{name: "cookie", val: 1}
		],
		priceRatio: 1.15,
		on: 0,
		val: 0,
		effects: {
			"inspiration": 0.0001,
			"cookieProgress": 0
		},
		earnCookie: function(amt = 1, cookiename = ""){
			if(cookiename == ""){
				var names = {//odds for each resource - each has so many pieces of the pie. Adding more makes the pie larger.
					"catnip": 1000,
					"wood": 900,
					"minerals": 700,
					"coal": 400,
					"iron": 500,
					"titanium": 200,
					"gold": 300,
					"oil": 500,
					"uranium": 75,
					"unobtainium": 10,
					"manpower": 900,
					"science": 1000,
					"culture": 1000,
					"faith": 500,
					"starchart": 1000,
					"antimatter": 50,
					"furs": 1000,
					"ivory": 1000,
					"spice": 1000,
					"unicorns": 100,
					"alicorns": 5,
					"necrocorns": 1,
					"tears": 25,
					"timeCrystal": 5,
					"relic": 2,
					"void": 1,
					"beam": 800,
					"slab": 600,
					"plate": 400,
					"steel": 300,
					"concrate": 200,
					"gear": 200,
					"alloy": 100,
					"eludium": 5,
					"scaffold": 700,
					"ship": 300,
					"tanker": 25,
					"kerosene": 300,
					"parchment": 800,
					"manuscript": 600,
					"compedium": 400,
					"blueprint": 200,
					"thorium": 10,
					"megalith": 200
				};
				var total = 0;
				for(var i in names){
					if(!gamePage.resPool.get(i).unlocked){
						odds = names[i];
						if(odds <= 50)
							odds = 0;
						odds = Math.sqrt(odds);
						odds /= 2;
						odds = Math.floor(odds);
						names[i] = odds;//allow potential to give you later resources, at a much reduced rate - anything under 25 initially won't get a chance
					}
					total += names[i];
				}
				var baseline = total;
				total += baseline;
				var which = Math.ceil(Math.random() * total);//spin the roulette wheel
				if(which > baseline){
					which -= baseline;
					for(var i in names)
						if(cookiename == ""){
							if(which <= names[i])
								cookiename = i;
							else
								which -= names[i];
						}
				}
			}
			if(cookiename != ""){
				var res = gamePage.resPool.get(cookiename);
				if(res){
					cookiename = res.title;
					gamePage.resPool.addResEvent(res.name,amt);
				}
				if(cookiename != "")
					cookiename += " cookie";
			}
			gamePage.resPool.get("cookie").unlocked=true;
			gamePage.resPool.addResEvent("cookie",amt);
			var earn = " earned ";
			if(amt < 0){
				earn = " lost ";
				amt = Math.abs(amt);
			}
			if(cookiename != ""){
				if(amt == 1)
					gamePage.msg("You" + earn + "one " + cookiename + "!","","cookie");
				else
					gamePage.msg("You" + earn + amt + " " + cookiename + "s!","","cookie");
			}
			else{
				if(amt == 1)
					gamePage.msg("You" + earn + "a WikiCookie!","","cookie");
				else
					gamePage.msg("You" + earn + gamePage.getDisplayValueExt(amt) + " WikiCookies!","","cookie");
			}
		},
		action: function(self, game){
			gamePage.bld.cookieProgress += self.effects["inspiration"] * self.on;
			if(gamePage.bld.cookieProgress >= 1){
				self.earnCookie(Math.floor(gamePage.bld.cookieProgress));
				gamePage.bld.cookieProgress -= Math.floor(gamePage.bld.cookieProgress);
			}
			self.effects["progress"] = gamePage.bld.cookieProgress * 100;
		},
		flavor: "Trout? My favorite!"
	});
	gamePage.bld.getPricesWithAccessor = function(bld) {
	 	var bldPrices = bld.get('prices');
		var ratio = this.getPriceRatioWithAccessor(bld);

		var prices = [];

		for (var i = 0; i< bldPrices.length; i++){
			prices.push({
				val: bldPrices[i].val * Math.pow(ratio, bld.get('val')),
				name: bldPrices[i].name
			});
			if(prices[prices.length - 1].name == "cookie")
				prices[prices.length - 1].val = Math.ceil(prices[prices.length - 1].val);
		}
	    return prices;
	 };
}

addCookieRes();

//===========================================================================================
//Notes for functions to keep in mind
//===========================================================================================

gamePage.getHyperbolicEffect(75000,100); // Gets diminishing returns. Input actual, limit to approach, and result will come out.
1 + gamePage.getResCraftRatio({name:"blueprint"}); // Gets how many of resource are produced per individual craft

//===========================================================================================
//Autoshatter script for Xeno, unnecessary now - integrated with base script
//===========================================================================================

shatterAmount=0;//This script is deprecated. It no longer works with the latest version.
autoShatter = function(){
	if(game.time.heat == 0 && game.resPool.get("timeCrystal").value>=1){
		if(gamePage.timeTab.visible){
			if(gamePage.timeTab.children[2].visible){
				var btn=gamePage.timeTab.children[2].children[0].children[0];
				if(btn.model==undefined){
					curTab=gamePage.ui.activeTabId;
					gamePage.ui.activeTabId = "Time";
					gamePage.ui.render();
					gamePage.ui.activeTabId = curTab;
					gamePage.ui.render();
				}
				if(shatterAmount==1)
					btn.controller.buyItem(btn.model,1,callback=function(result){if(result)btn.update();});
				else if(shatterAmount!=0)
					btn.controller.doShatterX5(btn.model,1,callback=function(result){if(result)btn.update();});
			}
		}
	}
}
gamePage.timer.addEvent(autoShatter,1);

//===========================================================================================
//Quick chart of basic praise loss rates on transcending - ratio is consistent between tiers
//===========================================================================================

//Chart generated by running getPraiseLoss(20,<percentage>)

Upgrade to TT 20			Before			 After			Loss	   Ratio
  100% matching		  451,142,254%	            0%	451,142,254%	100.000%
  125% matching		  504,392,374%	  225,571,124%	278,821,250%	 55.279%
  150% matching		  552,534,163%	  319,005,745%	233,528,417%	 42.265%
  175% matching		  596,805,107%	  390,700,652%	206,104,454%	 34.535%
  200% matching		  638,011,496%	  451,142,254%	186,869,242%	 29.289%

  300% matching		  781,401,309%	  638,011,496%	143,389,812%	 18.350%
  400% matching		  902,284,513%	  781,401,309%	120,883,204%	 13.397%
  500% matching		1,008,784,754%	  902,284,513%	106,500,240%	 10.557%
  600% matching		1,105,068,332%	1,008,784,754%	 96,283,578%	  8.713%
  700% matching		1,193,610,219%	1,105,068,332%	 88,541,887%	  7.418%
  800% matching		1,276,022,998%	1,193,610,219%	 82,412,779%	  6.459%
  900% matching		1,353,426,773%	1,276,022,998%	 77,403,775%	  5.719%
 1000% matching		1,426,637,083%	1,353,426,772%	 73,210,310%	  5.132%

 2000% matching		2,017,569,514%	1,966,483,513%	 51,086,001%	  2.532%
 3000% matching		2,471,007,916%	2,429,475,413%	 41,532,503%	  1.681%
 4000% matching		2,853,274,171%	2,817,382,501%	 35,891,670%	  1.258%
 5000% matching		3,190,057,503%	3,157,995,810%	 32,061,693%	  1.005%

10000% matching		4,511,422,588%	4,488,808,799%	 22,613,789%	  0.501%

//===========================================================================================
//Quick chart of paragon worth-it tipping points
//===========================================================================================

/*Tipping point means it's worth it for the given effect as soon as you have the listed
amount.

For instance, Malkuth's "Prod" is at 618. That means that if you buy Malkuth when you have
618 paragon, your production will stay the same or go up. If you buy it before, it'll
decrease, and if you buy it after, it'll increase more.

Malkuth's "Storage" is at 10.5k. This means that your caps for resources will decrease if
you buy Malkuth before you have 10.5k paragon, and it will increase if you buy it after
10.5k. If you buy it with exactly 10.5k, it will stay the same.
*/

/-----------------------------------------------\
| Sephirot	|	Cost	|	Prod	|	Storage	|
| --------- | --------- | --------- | --------- |
| Malkuth	|	500		|	618		|	10.5k	|
| Yesod		|	750		|	880		|	16.5k	|
| Hod		|	1250	|	1394	|	28.75k	|
| Netzach	|	1750	|	1906	|	42k		|
| Tiferet	|	2500	|	2669	|	62.5k	|
| Gevurah	|	5000	|	5182	|	130k	|
| Chesed	|	7500	|	7695	|	202.5k	|
| Binah		|	15000	|	15209	|	420k	|
| Chokhmah	|	30000	|	30221	|	870k	|
| Keter		|	60000	|	60233	|	1.8M	|
\-----------------------------------------------/
