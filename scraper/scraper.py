"""
@felipeares
This script runs every hour in an Amazon AWS EC2 ubuntu instance and load de scanned data into an S3 public reading bucket (with some historic files). It also saves into the EC2 instance a full screen shot of the last scan and some always usefull logs.
"""

import time
from datetime import datetime
from pytz import timezone
import json
import boto3
import subprocess
from pyvirtualdisplay import Display
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException
from selenium.common.exceptions import WebDriverException

# start time clock and helper
start_time = str(datetime.now(timezone('America/Santiago')).strftime("%Y-%m-%d %H:%M:%S"))
file_name = str(datetime.now(timezone('America/Santiago')).strftime("%Y%m%d.%H%M%S"))
start_clock = time.perf_counter()
last_milestone = start_clock
def pt(message):
    global last_milestone
    print(message + ': ' + str(round(time.perf_counter() - last_milestone, 2)) + ' seconds')
    last_milestone = time.perf_counter()
print('Execution - ' + start_time)

# killing past chromes
subprocess.call(['killall', '-q','chrome'])
pt('Killing Chromes')

# set main variables
display_size = {'height': 12000, 'width': 1280 }
output_dict = {
    'file_name': file_name,
    'date_started': start_time,
    'date_finished': '', # saved at the end
    'execution_time': '', # saved at the end
    'webdriver': 'chrome',
    'display_size': display_size,
    'error_log': [], # saved on execution
    'sites': [] # saved on execution
}
sites = [
    {'name': 'Cooperativa', 'abr': 'co', 'url': 'http://www.cooperativa.cl' },
    {'name': '24 Horas', 'abr': '24', 'url': 'http://www.24horas.cl'},
    {'name': 'Bío Bío', 'abr': 'bb', 'url': 'http://www.biobiochile.cl' },
    {'name': 'La Tercera', 'abr': 'lt', 'url': 'http://www.latercera.com' },
    {'name': 'Emol', 'abr': 'em', 'url': 'http://www.emol.com' },
    {'name': 'El Mostrador', 'abr': 'mo', 'url': 'http://www.elmostrador.cl' } 
]
sites_data = {}
pt('Load Variables')

# start virtual display
display = Display(visible=0, size=(display_size['width'], display_size['height']))
display.start()
pt('Virtual Display')

# browser options
opts = Options()
opts.add_argument('--no-sandbox')
opts.add_argument("--disable-setuid-sandbox")
opts.add_argument("--disable-flash-3d")
opts.add_argument("--disable-flash-stage3d")
opts.add_argument("user-agent=curl/7.35.0")
opts.add_argument("--kiosk");
pt('Browser Options')

# start browser
browser = webdriver.Chrome(executable_path='/usr/local/bin/chromedriver', chrome_options=opts)
pt('Start Browser')

# Loop sites
for site in sites:
    this_site_clock = time.perf_counter()
    sites_data[site['abr']] = {
        'name': site['name'],
        'abr': site['abr'],
        'url': site['url'],
        'date_started': str(datetime.now(timezone('America/Santiago')).strftime("%Y-%m-%d %H:%M:%S")),
        'date_finished': '', # saved at the end
        'execution_time': '', # saved at the end
        'error_log': [],
        'user_agent': 'user-agent=curl/7.35.0',
        'data': [],
        'child_count': 0
    } 
    
    try:
        # get site
        browser.set_page_load_timeout(60)
        browser.get(site['url'])
        pt('Get Site ' + site['name'])
        
        # testing wait
        time.sleep(1)
        pt('Just Waiting')
        
        # execute main javascript
        sites_data[site['abr']]['data'] = json.loads(browser.execute_script("var __rfres=function(){return allnodes=function(){const a=this;this.savedElements=[],this.saveElementAndContinueWithChilds=function(b,c){if(!(-1<['STYLE','SCRIPT','IFRAME','IMG'].indexOf(b.tagName)))if(3===b.nodeType&&0<b.wholeText.trim().length)a.saveElementToArray(b,c);else if(1===b.nodeType&&'none'!==window.getComputedStyle(b).display)for(let d=0;d<b.childNodes.length;d++)a.saveElementAndContinueWithChilds(b.childNodes[d],c+' '+b.tagName.toLowerCase())},this.saveElementToArray=function(b,c){const d=b.parentNode.getBoundingClientRect(),e=window.getComputedStyle(b.parentNode);a.savedElements.push({length:b.wholeText.trim().length,text:b.wholeText.trim(),'font-size':+e['font-size'].replace('px',''),height:d.height,width:d.width,x:d.left+ +e['padding-left'].replace('px',''),y:d.top+ +e['padding-top'].replace('px',''),tag:b.parentNode.tagName.toLowerCase(),'parent-tags':c,site:''})},this.saveElementAndContinueWithChilds(document.body,'')},new allnodes().savedElements}; return JSON.stringify(__rfres());"))
        sites_data[site['abr']]['child_count'] = len(sites_data[site['abr']]['data'])
        pt('Script Execution ' + site['name'])
        
        # save site data to final output
        sites_data[site['abr']]['date_finished'] = str(datetime.now(timezone('America/Santiago')).strftime("%Y-%m-%d %H:%M:%S"))
        sites_data[site['abr']]['execution_time'] = str(round(time.perf_counter() - this_site_clock))
        output_dict['sites'].append(sites_data[site['abr']])
        pt('Save Site Data ' + site['name'])
                
    except TimeoutException as ex:
        pt('TIMEOUT ERROR ' + site['name'])
        
    if sites_data[site['abr']]['child_count'] > 0:
        # save screenshot
        try:
            browser.get_screenshot_as_file('/home/ubuntu/mkprojects/p3test/images/' + site['abr'] + '.png')
            pt('Save Screenshot ' + site['name'])
        except WebDriverException:
            pt('IMG ERROR ' + site['name'])

# save date_finished and execution time
output_dict['date_finished'] = str(datetime.now(timezone('America/Santiago')).strftime("%Y-%m-%d %H:%M:%S"))
output_dict['execution_time'] = str(round(time.perf_counter() - start_clock))

# save to file
filename = '/home/ubuntu/mkprojects/p3test/saved_data/latest/data.json'
with open(filename, 'w') as outfile:
    json.dump(output_dict, outfile)
pt('Saved to File')


# save to amazon
bucket_name = 'medios-scraper'
final_name = 'latest/data.json'
final_name_historic = 'history/' + output_dict['file_name'] + '.json'

# Upload
s3 = boto3.client('s3')
s3.upload_file(filename, bucket_name, final_name)
s3.upload_file(filename, bucket_name, final_name_historic)

# Change permission to latest
s3 = boto3.resource('s3')
object_acl = s3.ObjectAcl(bucket_name,final_name)
response = object_acl.put(ACL='public-read')
pt('Saved data to Amazon')


# close browser
browser.close()
browser.quit()
pt('Close Browser')

# close display
display.popen.kill()
pt('Close Display')
print('Total Time ' + str(round(time.perf_counter() - start_clock)) + ' seconds')
print('')