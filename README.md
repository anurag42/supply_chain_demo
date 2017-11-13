# supply_chain_demo
This repository contains the source code for Supply Chain application. It is built on node.js server and Ethereum blockchain. 
Smart Contracts are written in Solidity.

This app is developed for IITD Hackathon.

Benefit of this application:-

There are many touch points in a typical supply chain. There are multiple parties involved in a trade and there are multiple 
documents exchanged. Any error at any step leads to delay in the process eventually leading to loss of time and money. 
Some of the pain points in a supply chain are:

1. Validating the authenticity of the documents (like Quoatation, Invoice, PO, etc.) exchanged
2. Trusting other parties
3. Long payment cycles

This application is built on Blockchain which eliminates all the above challenges. This application is modelled on supply chain
of cars. The cycle assumed is Spare parts manufacturer, OEM, Dealer, Customer, and Insurer. All the documents involved are 
permanently stored on Blockchain and the payments are released automatically when all the parties agree to the uploaded
documents and condidtions defined.


System Architecture:-

![System Architecture](/arch.jpg "System Architecture")

1. Backend server is Node.js
2. Database used is MongoDB
3. Node.js interacts with IPFS (Inter Planetary File System) to upload documents on the distributed network.
4. IPFS return a hash address which is stored on the Smart Contract
5. Browser and Node.js interacts with functions on Smart Contracts using Web3.js
6. The function calls to Smart Contracts are blockchain transactions
7. These blockchain transactions are sent to Ethereum Blockchain via Geth client.

About Us:-
We are a bunch of Blockchain enthusiasts. We are all graduates from IIT Kharagpur.
