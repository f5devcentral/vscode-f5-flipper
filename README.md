
# project-flipper

Exploring Citrix/NetScaler configs

This project aims to explore the process of breaking down, analyzing and abstracting applications from a Citrix NetScaler config/archive (.conf/.tgz)

Future goals include conversion outputs for different supported F5 solutions, including BIG-IP TMOS, NGINX and F5 Distributed Cloud (XC)

> It is recommended to install the ns.conf vscode extension by Tim Denholm (timdenholm.netscaler).  This extension provides nice synctax highlighting for the ns config.  https://marketplace.visualstudio.com/items?itemName=timdenholm.netscaler#overview.  Great work Tim!

![Project Flipper](project-flipper-dophin.png)

# I need help

Greetings, I need help to grow this tool.  It is at a point where I need feeback from the field about the application abstraction process and diagnostic rules.  Please, use the tool and provide any feedback/issues via github.  ANY and ALL feedback is respected and appreciated.  Thank you.

If your looking to contribute a little more, here are some ways;

- Documentation
- Tuning diagnostic ruleset
- Code (JavaScript/TypeScript)
  - fixing bugs and adding new features
  - take a look at the github issues to see whats going on
- Conversion output
  - Helping to map NS features to F5 features
  - Help design and implement output templating

# Roadmap

## Phase 1: Archive unpack and config Parsing (Complete)

This phase is about unpacking an archive and/or parsing the ns.conf file.  

Parsing includes the process of organizing and converting the important config lines into a structure that is a bit more predictable and searchable.  This process basically breaks down the config file into a json structure that allows subsequent processes to realiably search for and access key data when needed. (see breakdown process)

## Phase 2: Application Abstraction (~60% complete)

This phase of the roadmap is focused on crawling the parsed config and abstracting applications.  In these early phases of the project, we have tested with v10 through v13.1.  There is currently no deviation from this process based on these version.  This will probably change as the project progresses.

## Phase 3: Analytics/Diagnostics (~10%)

This phase is focused on analyzing the individual applications produced by the abstraction process.

The foundation is to use vscode diagnostics and supporting ruleset to provide feedback about different ns config pieces/options/parameters

This information may possibly get fed back into the abstration process to help identify key application features for converstion outputs.

## Phase 4: Conversion outputs for XC/TMOS/NGINX (pending)

This phase is focused on utilizing the information gathered from the diagnostics and abstraction process to provide the beginning of deploying a similar application on F5 technology (XC/TMOS/NGINX).

This phase will begin once we have more confidence that phases two and three are providing solid output to base the conversions on.  This is the major request for feedback.  To help fine tune the abstraction and analytics.   

The goal here is to provide details about the applications current features on NS/ADC and some output to begin deploying that application in the different F5 technologies.  A single click, production grade application conversion is the goal, but realistically, an understanding of the features and a path/assistance getting there is probably more of where things will land.

These outputs will probably include basic AS3 for TMOS/NEXT, JSON body for deployment on F5 Distributed Cloud, and possibly configuration snippets for NGINX (or declarative json)

## other features

Please check out the github issues for details on bugs and enhancements.  Don't hesitate to open an issue to request a feature, ask a question, or provide feedback.

- a button/form within vscode to easily provide feedback
  - at least a button to open a github issue
- a more detailed breakdown of the different rules in the diagnostics ruleset
  - the idea is to prefix each rule to which F5 technology it applies to, "XC-" for F5 Distributed cloud rules, "TMOS-" for F5 TMOS rules, and "NX-"? for NGINX rules

### Report output

There is currently a report to output all the details from the tool.  This include all the details about the unpacking/parsing/app-abstraction process and details about the diagnstics.

There are additional stats to understand numbers of applications, breakdown of the different types of applications and supporting configuration objects.  High level diagnostic stats, along with per-app diagnostics are also included.

The goal for this report is to provide a full output to easily search, reference and add notes to when working through the process

### 

# How to get started using the extension

1. Install the extension via the VSCode extension marketplace
2. Open a folder with a Citrix ADC/NS archive/.conf or use the button to browse for the file

- Once the abstraction process has completed.  This should bring you to the new view from project-flipper with the config breakdown
  - Select an application to view it's config
  - Hover over the top menu item to see breakdown stats

<img src="./images/flipper-2.gif" alt="drawing" width="100%"/>

# Breakdown Process

## 1. Archive unpack

> if file is .conf, skip to next step...

- stream archive (.tgz)
  - capture all .conf files
  - certs?
  - logs?


## 2. Breakdown/parse config

- sort the config lines by all the verbs in the following order
  - ['add','set','bind','link','enable','disable']
- loop through each line and break down the parent object reference to be converted to a json tree
  - all the verbs types and names, become nested named objects
  - <verb> (<type>|<type> <subType>) <name> (<details>|<options>|<references>)
  - only parent objects defined in the regex tree will be abstracted!
    - everything else gets left behind

example
```json
{
    "add": {
        "lb": {
            "monitor": {
                "app1-http-monitor": "some monitor configuration details"
            },
            "vserver": {
                "app1-80-vsrv": "details/notes/options/references",
                "app1-443-vsrv": "details/notes/options/references"
            }
        },
        "ssl": {
            "certKey": {
                "cert1": "asdf",
                "key1": "asdf"
            }
        },
        "server": {}
    },
    "bind": {
        "lb": {
            "vserver": {
                "app1-443-vsrv": "bind details"
            }
        }
    },
    "set": {
        "ssl": {
            "cert1": "details"
        }
    }
}
```


## 3. Abstract applications

### walk cs vservers

This second phase will loop through each 'add vs vserver' and 'add lb vserver' to walk the config tree and abstract each application's config

1. start with each 'add lb vserver'
2. add ssl options with 'set ssl vserver'
3. add pool binding with 'bind lb vserver'
4. add pool details with 'add serviceGroup'
5. add pool bingdings with 'bind serviceGroup'
6. add monitor from service pool binginds 'add lb monitor'

### walk lb vserver

Add walking details...

### walk gslb

Add walking details...

# Notes

- All of the 'add' operations need to happen before the 'bind' operations
- order config lines by the following to make sure things are parsed in order
  - add -> set -> bind -> link -> enable -> disable
- .conf are the main config files, like tmos
  - each line is a single config (unlike tmos)
- archive files has an .tgz extension
  - Full and basic backups
- .log for log files
  - location?
- certs?
  - location?
- config lines with ip addresses in them (unique to customer env)
  - add ns ip
  - bind vlan ...
  - add snmp trap generic ...
  - add server <name> <ip>
  - add lb vserver <name> <type> <ip>
  - add cs vserver <name> <type> <ip>
  - add gslb site <name> <ip>
  - set ns rcpNode <ip>
  - seems that **'add lb vserver'** and **'add cs vserver'** are the two to indicate the front door for an app


# Resources

## NGINX

https://docs.nginx.com/nginx/deployment-guides/migrate-hardware-adc/citrix-adc-configuration/

## John Alam

https://community.f5.com/t5/codeshare/citrix-netscaler-to-f5-big-ip/ta-p/277635

## Carl Stalhood

https://github.com/cstalhood/Get-ADCVServerConfig 

https://www.carlstalhood.com/netscaler-scripting/ 

## Citrix ADC

### Citrix ADC Firmware Release Cycle

https://support.citrix.com/article/CTX241500/citrix-adc-firmware-release-cycle


Citrix has announced following updates to the Citrix ADC firmware release cycle.

- Citrix ADC Firmware Release Cycle (5 year) will fall on all versions starting with 13.0 and all subsequent releases.
  - Year 1 and Year 2 will include feature releases every quarter
  - Year 3 and Year 4 will include maintenance releases every 2-6 months until End of Maintenance (EOM) date. The updates will be more frequent during the initial maintenance years
  - Year 5 will include technical support only until End of Life (EOL) date for the firmware version
- Version 13.0 which initially had 3 year Release Cycle will now have the 5 year release cycle as described above.
- All Citrix ADC Firmware Releases will have a release cadence of once every two years.
  - Since 13.0 released in 2019, the next Citrix ADC Firmware Release will be in 2021.
- There is no change in the Release Cycle for 12.1, 12.0, 11.1, 11.0.
- 10.5 will have its own status with a notice of status change (NSC) announced on October 31 2018 and an EOM on April 30 2019. EOL/End of Support will fall on April 30 2020.
- To determine which build is a feature release vs maintenance release please access the Citrix ADC Downloads Page and click on the Firmware which will specify if that particular build is a feature release or maintenance release.
- The Citrix Firmware Release Cycle matrix contains information on all different firmware versions, their dates of feature release, maintenance release, and support. Please refer to this matrix for any questions on version release dates, EOM, EOS, and EOL.

> For now, focus will be on v12.1+ since it was the most recent to fall off maintenance

### Citrix Product Lifecycle Matrix

https://www.citrix.com/support/product-lifecycle/product-matrix.html

Product | Version | Language | NSC* | EOS* | EOM* | EOL*
| :--- | ---: | :---: | :---: | :---: | :---: | :---:
NetScaler Firmware | 13.1 (GA: 15-Sep-21) | EN | N/A | N/A | 15-Sep-25 | 15-Sep-26
NetScaler Firmware | 13.0 (GA: 15-May-19) | EN | N/A | N/A | 15-Jul-23 | 15-Jul-24
NetScaler Firmware | 12.1 (GA: 25-May-18) | EN | N/A | N/A | 30-May-22 | 30-May-23

# Items to consider

Below are some questions and items to consider when looking to migrate.

- What are the business goals with the current NS deployment?
  - What key features solve the business need?
    - Remote VPN?
    - load balancing?
    - Authentication?
    - GSLB?
    - Citrix ICA integration?
      - StoreFront?
      - Single application delivery
      - Full RDP/VDI?
    - Content switching/serving?
    - Caching?
    - SSL offloading?
    - Simple solution integration with other technology offerings
      - ica analytics?
      - Deep Citrix application delivery integration?
        - cost?
- What struggles does the current solution present?
  - Lacking features?
    - Advanced authentication options?
    - Advanced load balancing options?
    - Advanced GSLB options?
  - Lacking cloud support?
  - Lacking modern architecture integrations (ex. SaaS/k8s)?
  - Costs?
  - Hardware options?
- Has the business needs changed since this solution has been deployed?
  - If yes, how so?
- Does the business prefer Cap-Ex or Opp-Ex?
- How many people currently manage the existing NS infrastructure?
  - Is this their only focus?
  - Are they open to retooling?
- What is the automation strategy?
- What is the DR/Backup strategy?

## links

https://support.citrix.com/article/CTX476864/notice-of-change-announcement-for-perpetual-citrix-adc-eos
https://www.citrix.com/support/product-lifecycle/product-matrix.html


https://www.techtarget.com/searchenterprisedesktop/news/252529104/Thousands-of-Citrix-Tibco-employees-laid-off-following-merger
https://www.reuters.com/business/finance/banks-brave-junk-debt-jitters-with-38-bln-citrix-bond-sale-2023-04-03/
https://www.theregister.com/2023/03/03/citrix_universal_license/


# ChatGPT

As I started this journey, and knowing very little about NetScaler, I decided to ask ChatGPT and see just how much help it would be.

So, while none of the configs it produced were a straight copy/paste into the respective technologies, it did get most of the way.  Enought to provide a ton of value and help me quickly understand what I was working with. 

Here is a document outlining the conversation

https://github.com/f5devcentral/vscode-f5-flipper/blob/main/chatGPT.md

