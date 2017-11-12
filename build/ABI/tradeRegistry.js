tradeRegistryABI = [{"constant":false,"inputs":[{"name":"uid","type":"bytes32"}],"name":"initDocs","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"uid","type":"bytes32"},{"name":"sender","type":"address"},{"name":"docType","type":"bytes32"},{"name":"_hash","type":"bytes"}],"name":"upload","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"uid","type":"bytes32"},{"name":"docName","type":"bytes32"},{"name":"version","type":"uint256"}],"name":"getDoc","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"uid","type":"bytes32"},{"name":"docName","type":"bytes32"}],"name":"getLatestDoc","outputs":[{"name":"","type":"bytes"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"uid","type":"bytes32"},{"name":"_invoiceAmount","type":"uint256"},{"name":"_noOfDays","type":"uint256"}],"name":"uploadInvoice","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"uid","type":"bytes32"},{"name":"sender","type":"address"},{"name":"docType","type":"bytes32"},{"name":"action","type":"bytes32"},{"name":"extraData","type":"bytes"}],"name":"action","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"uid","type":"bytes32"}],"name":"deposit","outputs":[],"payable":true,"stateMutability":"payable","type":"function"},{"constant":false,"inputs":[{"name":"uid","type":"bytes32"},{"name":"tradeParties","type":"address[]"},{"name":"tradePartiesRole","type":"bytes32[]"}],"name":"createTrade","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"uid","type":"bytes32"},{"name":"_invoiceAmount","type":"uint256"},{"name":"_noOfDays","type":"uint256"}],"name":"uploadLoc","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"uid","type":"bytes32"}],"name":"payToSeller","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"name":"uid","type":"bytes32"}],"name":"LogTradeCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"name":"docName","type":"bytes32"},{"indexed":false,"name":"status","type":"uint8"}],"name":"LogUpload","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"sender","type":"address"},{"indexed":true,"name":"docName","type":"bytes32"}],"name":"LogApprove","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"sender","type":"address"},{"indexed":true,"name":"docName","type":"bytes32"}],"name":"LogReject","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"uid","type":"bytes32"},{"indexed":false,"name":"hash","type":"bytes"}],"name":"LogGetDoc","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"uid","type":"bytes32"},{"indexed":false,"name":"amount","type":"uint256"}],"name":"LogDeposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"uid","type":"bytes32"},{"indexed":false,"name":"status","type":"string"}],"name":"LogPayment","type":"event"}];
