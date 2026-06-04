# KeyInvoice API Reference (Offline Extract)

Extracted from the authenticated KeyInvoice API documentation page opened in the in-app browser on 2026-06-04. Keep this file updated if KeyInvoice changes its online documentation.

## Base API

- API endpoint: `https://login.keyinvoice.com/API5.php`
- Transport: HTTP POST with JSON body.
- Authentication flow: call `authenticate` with the `Apikey` header, then use returned `Sid` header for subsequent calls.
- Session lifetime: 3600 seconds. Avoid calling `authenticate` again while the existing session remains valid, especially while it has more than 300 seconds remaining.
- Daily API limit documented by KeyInvoice: 5000 calls/day.
- Parameters marked with `*` are mandatory and must not be empty strings.

## Sections

- `SESSION`
- `TABLES`
- `CLIENTS`
- `SUPPLIERS`
- `PRODUCTS`
- `DOCUMENTS`

## Document Types

Documentos de Venda:

| Code | Document type |
| ---: | --- |
| 4 | Fatura |
| 6 | Devolucao |
| 7 | Nota de Credito |
| 8 | Nota de Debito |
| 13 | Encomenda |
| 15 | Guia de Remessa |
| 16 | Guia de Transporte |
| 32 | Fatura Simplificada |
| 34 | Fatura-Recibo |

## Methods

### SESSION

- `authenticate`
- `getSAFTfile`
- `verifyUserInsertionPricesWithVAT`

#### authenticate

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=SESSION&m=authenticate`

Description:

Autentica uma chave de API e gera um identificador de sessão para as comunicações com o software.
Essa sessão tem um tempo de vida de 3600 segundos.

Evite fazer uma nova chamada a este método se ainda tiver um identificador ( APISession ) válido, apenas deverá voltar a chamar o método caso a seu identificador expire.
Pedidos de autenticação que contenham APISession válido com tempo de vida superior a 300 segundos, serão inválidos.
Existe um limite de 5000 chamadas diárias através da nossa API. Caso pretenda utilizar diariamente mais do que o limite definido poderá adquirir pack's adicionais. Mais informações contacte-nos através do email suporte@keyinvoice.com

Headers:

```text
Apikey: CHAVE_API 
Content-Type: application/json
```

Parameters:

```text
method*: "authenticate"
```

Responses:

```text
{Status:1,Sid:IDENTIFICADOR_SESSÃO}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Apikey: CHAVE_API' --header 'Content-Type: application/json' \ 
--data '{"method":"authenticate"}'
```

#### getSAFTfile

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=SESSION&m=getSAFTfile`

Description:

Emite uma cópia do ficheiro SAFT para esta empresa, para o ano/mês indicados. Ficheiro em formato Base64.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getSAFTfile"
Year*: ano para o qual pretende exportar o SAFT-PT
Month: mês para o qual pretende exportar o SAFT-PT
```

Responses:

```text
{Status:1,Data:{FileContent}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getSAFTfile","Year":2025}'
```

#### verifyUserInsertionPricesWithVAT

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=SESSION&m=verifyUserInsertionPricesWithVAT`

Description:

Indica se o utilizador da sessão insere os preços com IVA ou sem IVA incluído.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "verifyUserInsertionPricesWithVAT"
```

Responses:

```text
{Status:1,Data:{PricesWithVAT}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"verifyUserInsertionPricesWithVAT"}'
```

### TABLES

- `company`
- `countCurrencies`
- `countFamilies`
- `countSalesmen`
- `countryExists`
- `currencyExists`
- `deleteCurrency`
- `deleteFamily`
- `familyExists`
- `getBrands`
- `getColorsSizes`
- `getCurrency`
- `getDiscounts`
- `getFamily`
- `getPriceLevels`
- `getTaxes`
- `insertColorSize`
- `insertCountry`
- `insertCurrency`
- `insertCurrencyExchange`
- `insertFamily`
- `listCountries`
- `listCurrencies`
- `listCurrencyExchanges`
- `listDocumentSeries`
- `listFamilies`
- `listPaymentMethods`
- `listSalesmen`
- `updateCurrency`
- `updateFamily`

#### company

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=company`

Description:

Obtém um resumo dos dados gerais da empresa.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "company"
```

Responses:

```text
{Status:1,Data:{VATIN,Name,Address,Locality,PostalCode,Phone,Fax,Email,ShareCapital,Conservatory}}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"company"}'
```

#### countCurrencies

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=countCurrencies`

Description:

Indica o número de registos de moedas existentes.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "countCurrencies"
```

Responses:

```text
{Status:1,Data:{Count}}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"countCurrencies"}'
```

#### countFamilies

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=countFamilies`

Description:

Indica o número de registos de famílias existentes.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "countFamilies"
```

Responses:

```text
{Status:1,Data:{Count}}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"countFamilies"}'
```

#### countSalesmen

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=countSalesmen`

Description:

Indica o número total de vendedores.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "countSalesmen"
```

Responses:

```text
{Status:1,Data:{Count}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"countSalesmen"}'
```

#### countryExists

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=countryExists`

Description:

Verifica se o país com o código indicado existe.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "countryExists"
Code*: código/sigla de país, conforme tabela de Países SAFT
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"countryExists","Code":"PT"}'
```

#### currencyExists

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=currencyExists`

Description:

Verifica se existe um registo de moeda com o identificador interno indicado.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "currencyExists"
IdCurrency*: id da moeda
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"currencyExists","IdCurrency":"1"}'
```

#### deleteCurrency

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=deleteCurrency`

Description:

Apaga um registo de moeda.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "deleteCurrency"
IdCurrency*: id da moeda
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"deleteCurrency","IdCurrency":"1"}'
```

#### deleteFamily

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=deleteFamily`

Description:

Apaga um registo de família

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "deleteFamily"
IdFamily*: id da família
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"deleteFamily","IdFamily":"1"}'
```

#### familyExists

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=familyExists`

Description:

Verifica se uma família já existe na base de dados.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "familyExists"
IdFamily*: id da família
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"familyExists","IdFamily":"1"}'
```

#### getBrands

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=getBrands`

Description:

Devolve a lista de Marcas de artigos, e respectivos Modelos.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getBrands"
```

Responses:

```text
{Status:1,Data:{Brands:[{IdBrand,BrandName,Models:[{IdModel,ModelName}]}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getBrands"}'
```

#### getColorsSizes

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=getColorsSizes`

Description:

Devolve a lista total de cores e tamanhos criados para esta empresa.
(Type: Cor/Color ou Tamanho/Size)

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getColorsSizes"
```

Responses:

```text
{Status:1,Data:{ColorsSizes:[{Id,Name,Type}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getColorsSizes"}'
```

#### getCurrency

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=getCurrency`

Description:

Obtém os dados de um registo de moeda existente, identificado pelo id indicado.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getCurrency"
IdCurrency*: id da moeda
```

Responses:

```text
{Status:1,Data:{IdCurrency,Currency,Name,IntegerName,DecimalName,Symbol}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getCurrency","IdCurrency":"1"}'
```

#### getDiscounts

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=getDiscounts`

Description:

Processa e devolve o cálculo dos descontos(em percentagem) configurados por cliente/artigo.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getDiscounts",
IdProducts*: array com os ids de artigos
IdClient: id do cliente para o qual se pretendem obter os descontos
VATIN: (ou) NIF do cliente para o qual se pretendem obter os descontos
```

Responses:

```text
{Status:1,Data:{Discounts:[{IdProduct,Discount}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getDiscounts","IdProducts":["0001","A0004"]}'
```

#### getFamily

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=getFamily`

Description:

Devolve os dados de uma família.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getFamily"
IdFamily*: id da família
```

Responses:

```text
{Status:1,Data:{IdFamily,Name,FamilyCategoryId,Ref}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getFamily","IdFamily":"1"}'
```

#### getPriceLevels

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=getPriceLevels`

Description:

Lista todos os escalões de preços existentes.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getPriceLevels"
```

Responses:

```text
{Status:1,Data:{PriceLevels:[{Id,Name,PricesWithVAT,PricesWithVATDescription}]}}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getPriceLevels"}'
```

#### getTaxes

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=getTaxes`

Description:

Obtém a lista de Taxas de IVA existentes nas tabelas da empresa.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getTaxes"
```

Responses:

```text
{Status:1,Data:{Taxes:[{Id,Value,ExemptionReason,ExemptionReasonCode}]}}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getTaxes"}'
```

#### insertColorSize

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=insertColorSize`

Description:

Permite inserir registos de Cor ou Tamanho na lista de Cores/Tamanhos geral da empresa.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "insertColorSize"
Type*: identifica se é uma cor ou um tamanho(color ou size)
Name*: designação da cor/tamanho
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertColorSize","Type":"size","Name":"S"}'
```

#### insertCountry

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=insertCountry`

Description:

Cria um novo registo de país.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "insertCountry"
Code*: código/sigla do país (ISO-3166 1-alpha-2)
Name*: nome do país
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertCountry","Code":"PT","Name":"Portugal"}'
```

#### insertCurrency

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=insertCurrency`

Description:

Insere um novo registo de moeda.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "insertCurrency"
Currency*: abreviatura/código da moeda
Name*: nome da moeda
IntegerName*: designação da moeda na unidade principal
DecimalName*: designação da moeda na sub divisão da unidade
Symbol: símbolo da moeda
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertCurrency","Currency":"EUR","Name":"Euro","IntegerName":"euro(s)","DecimalName":"cêntimo(s)"}'
```

#### insertCurrencyExchange

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=insertCurrencyExchange`

Description:

Cria um registo de conversão para o registo de moeda indicado.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "insertCurrencyExchange"
IdCurrency*: id da moeda
ExchangeDate*: data de referência do câmbio
ExchangeValue*: valor do câmbio
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertCurrencyExchange","IdCurrency":"2","ExchangeDate":"2025-01-01","ExchangeValue":"1.20"}'
```

#### insertFamily

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=insertFamily`

Description:

Cria um novo registo de família.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "insertFamily"
Name*: nome da família
Ref*: referência da família
IdParentFamily: código de família para o registo «pai», caso exista
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertFamily","Name":"Família 1","Ref":"FAM1"}'
```

#### listCountries

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=listCountries`

Description:

Devolve a lista de países atualmente existentes na aplicação.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "listCountries"
```

Responses:

```text
{Status:1,Data:{Countries:[{IdCountry,Code,Name,Default}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"listCountries"}'
```

#### listCurrencies

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=listCurrencies`

Description:

Devolve a lista de registos de moedas existentes.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "listCurrencies"
```

Responses:

```text
{Status:1,Data:{Currencies:[{IdCurrency,Currency,Name,IntegerName,DecimalName,Symbol}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"listCurrencies"}'
```

#### listCurrencyExchanges

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=listCurrencyExchanges`

Description:

Lista dos valores de conversão da moeda indicada.
(100 registos começando na posição indicada em «offset»)

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "listCurrencyExchanges"
IdCurrency*: id da moeda
Offset: nº do registo/linha a partir do qual deve construir a resposta
```

Responses:

```text
{Status:1,Data:{Exchanges:[{ExchangeDate,Exchange}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"listCurrencyExchanges","IdCurrency":"1"}'
```

#### listDocumentSeries

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=listDocumentSeries`

Description:

Lista todas as séries activas para o tipo de documento indicado. (Ver tipos de documentos em anexos)

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "listDocumentSeries"
DocType*: tipo de documento
```

Responses:

```text
{Status:1,Data:{Series:[{IdSerie,Name,Ref,Info1,Info2}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"listDocumentSeries","DocType":4}'
```

#### listFamilies

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=listFamilies`

Description:

Devolve a lista de Famílias de artigos, e respectivas Sub-Famílias.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "listFamilies"
```

Responses:

```text
{Status:1,Data:{Families:[{IdFamily,Name,FamilyCategoryId,Ref}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"listFamilies"}'
```

#### listPaymentMethods

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=listPaymentMethods`

Description:

Lista de modos de pagamento.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "listPaymentMethods"
```

Responses:

```text
{Status:1,Data:{Payments:[{IdPayment,Name}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"listPaymentMethods"}'
```

#### listSalesmen

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=listSalesmen`

Description:

Lista de vendedores.
(100 registos começando na posição indicada em «offset»)

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "listSalesmen"
Offset: nº do registo/linha a partir do qual deve construir a resposta
```

Responses:

```text
{Status:1,Data:{Salesmen:[{IdSalesman,Name}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"listSalesmen"}'
```

#### updateCurrency

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=updateCurrency`

Description:

Atualiza os dados de um registo de moeda existente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "updateCurrency"
IdCurrency*: id da moeda
Currency*: abreviatura/código da moeda
Name*: nome da moeda
IntegerName*: designação da moeda na unidade principal
DecimalName*: designação da moeda na sub divisão da unidade
Symbol: símbolo da moeda
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"updateCurrency","IdCurrency":"1","Currency":"EUR","Name":"Euro","IntegerName":"euro(s)","DecimalName":"cêntimo(s)"}'
```

#### updateFamily

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=TABLES&m=updateFamily`

Description:

Atualiza os dados de um registo de família.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "updateFamily"
IdFamily*: id da família
Name*: nome da família
Ref: referência da família
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"updateFamily","IdFamily":"1","Name":"Família A"}'
```

### CLIENTS

- `clientExists`
- `countAltAddresses`
- `countClients`
- `deleteAltAddress`
- `deleteClient`
- `getClient`
- `getClientCurrentAccount`
- `insertAltAddress`
- `insertClient`
- `listAltAddresses`
- `listClients`
- `sendClientCurrentAccount2Email`
- `updateAltAddress`
- `updateClient`

#### clientExists

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=clientExists`

Description:

Verifica se um cliente existe.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "clientExists"
IdClient*: id do cliente ou VATIN*: NIF do cliente
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"clientExists","VATIN":"123456789"}'
```

#### countAltAddresses

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=countAltAddresses`

Description:

Indica o número total de moradas alternativas de um determinado cliente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "countAltAddresses"
IdClient*: id do cliente ou VATIN*: NIF do cliente
```

Responses:

```text
{Status:1,Data:{Count}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"countAltAddresses","IdClient":"200"}'
```

#### countClients

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=countClients`

Description:

Indica o número total de clientes.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "countClients"
```

Responses:

```text
{Status:1,Data:{Count}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"countClients"}'
```

#### deleteAltAddress

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=deleteAltAddress`

Description:

Elimina uma morada alternativa de um determinado cliente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "deleteAltAddress"
IdClient*: id do cliente ou VATIN*: NIF do cliente
AddressCode*: id da morada alternativa do cliente
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"deleteAltAddress","IdClient":"5","AddressCode":"2"}'
```

#### deleteClient

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=deleteClient`

Description:

Apaga um cliente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "deleteClient"
IdClient*: id do cliente ou VATIN*: NIF do cliente
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"deleteClient","IdClient":"0001"}'
```

#### getClient

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=getClient`

Description:

Devolve os dados de um cliente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getClient"
IdClient*: id do cliente ou VATIN*: NIF do cliente
```

Responses:

```text
{Status:1,Data:{IdClient,VATIN,Name,Address,Locality,PostalCode,Phone,Fax,Email,Comments,Country,CountryCode,IdSalesman,PriceLevel,Discount}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getClient","IdClient":"0001"}'
```

#### getClientCurrentAccount

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=getClientCurrentAccount`

Description:

Obtém o resumo da conta corrente de um cliente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getClientCurrentAccount"
IdClient*: id do cliente ou VATIN*: NIF do cliente
```

Responses:

```text
{Status:1,Data:{Documents:[{Date,DocType,DocNum,RefDoc,Deb,Cre,Balance}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getClientCurrentAccount","IdClient":"100"}'
```

#### insertAltAddress

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=insertAltAddress`

Description:

Insere uma nova morada alternativa no cliente indicado.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "insertAltAddress"
IdClient*: id do cliente ou VATIN*: NIF do cliente
Address*: morada do cliente
PostalCode: código postal do cliente
Locality: localidade do cliente
IdCountry*: id do país ou CountryCode*: código/sigla do país (ISO-3166 1-alpha-2)
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertAltAddress","IdClient":"200","Address":"Rua A nº10","PostalCode":"444-333","CountryCode":"PT"}'
```

#### insertClient

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=insertClient`

Description:

Cria um cliente(com NIF).
Para consumidor final(sem NIF) deve preencher os dados no cabeçalho dos documentos.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "insertClient"
VATIN*: NIF do cliente
Name*: nome do cliente
Address: morada do cliente
PostalCode: código postal do cliente
Locality: localidade do cliente
IdCountry: id do país ou CountryCode: código/sigla do país (ISO-3166 1-alpha-2)
Phone: contacto telefónico do cliente
Fax: fax do cliente
Email: endereço de email do cliente
Comments: observações úteis relativas a este cliente
IdClient: id do cliente
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertClient","VATIN":"123456789","Name":"Cliente A","Address":"Rua ABC nº1","PostalCode":"1234-123","CountryCode":"PT"}'
```

#### listAltAddresses

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=listAltAddresses`

Description:

Lista as moradas alternativas de um determinado cliente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "listAltAddresses"
IdClient*: id do cliente ou VATIN*: NIF do cliente
```

Responses:

```text
{Status:1,Data:{Addresses:[{AddressCode,Address,Locality,PostalCode,Country}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"listAltAddresses","IdClient":"200"}'
```

#### listClients

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=listClients`

Description:

Lista de clientes.
(100 registos começando na posição indicada em «offset»)

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "listClients"
Name: nome do cliente
VATIN: NIF do cliente
Contact: telefone ou telemóvel do cliente
Offset: nº do registo/linha a partir do qual deve construir a resposta
```

Responses:

```text
{Status:1,Data:{Clients:[{IdClient,VATIN,Name,Address,Locality,PostalCode,Phone,Fax,Email,Comments}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"listClients"}'
```

#### sendClientCurrentAccount2Email

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=sendClientCurrentAccount2Email`

Description:

Envia o link da conta corrente de cliente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "sendClientCurrentAccount2Email"
IdClient*: id do cliente ou VATIN*: NIF do cliente
Email: endereço de email
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"sendClientCurrentAccount2Email","IdClient":"100","Email":"email@dominio.com"}'
```

#### updateAltAddress

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=updateAltAddress`

Description:

Altera os dados da morada alternativa no cliente indicado.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "updateAltAddress"
IdClient*: id do cliente ou VATIN*: NIF do cliente
AddressCode*: id da morada alternativa do cliente
Address: morada do cliente
PostalCode: código postal do cliente
Locality: localidade do cliente
IdCountry: id do país ou CountryCode: código/sigla do país (ISO-3166 1-alpha-2)
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"updateAltAddress","IdClient":"200","AddressCode":"1","PostalCode":"1000-100"}'
```

#### updateClient

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=CLIENTS&m=updateClient`

Description:

Atualiza os dados de um cliente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "updateClient"
IdClient*: id do cliente ou VATIN*: NIF do cliente
Name: nome do cliente
Address: morada do cliente
PostalCode: código postal do cliente
Locality: localidade do cliente
Phone: contacto telefónico do cliente
Fax: fax do cliente
Email: endereço de email do cliente
Comments: observações úteis relativas a este cliente
Mobile: telemóvel do cliente
IdSalesman: id do vendedor do cliente
PriceLevel: id do escalão de preços do cliente
PaymentTerms: condição de pagamento(em dias)
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"updateClient","IdClient":"123","Email":"email@dominio.com"}'
```

### SUPPLIERS

- `countSuppliers`
- `deleteSupplier`
- `getSupplier`
- `insertSupplier`
- `listSuppliers`
- `supplierExists`
- `updateSupplier`

#### countSuppliers

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=SUPPLIERS&m=countSuppliers`

Description:

Indica o número total de fornecedores.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "countSuppliers"
```

Responses:

```text
{Status:1,Data:{Count}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"countSuppliers"}'
```

#### deleteSupplier

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=SUPPLIERS&m=deleteSupplier`

Description:

Apaga um fornecedor.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "deleteSupplier"
IdSupplier*: id do fornecedor ou VATIN*: NIF do fornecedor
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"deleteSupplier","IdSupplier":"100"}'
```

#### getSupplier

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=SUPPLIERS&m=getSupplier`

Description:

Devolve os dados de um fornecedor.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getSupplier"
IdSupplier*: id do fornecedor ou VATIN*: NIF do fornecedor
```

Responses:

```text
{Status:1,Data:{IdSupplier,VATIN,Name,Address,Locality,PostalCode,Phone,Fax,Email,Comments,Country,CountryCode}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getSupplier","IdSupplier":"0005"}'
```

#### insertSupplier

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=SUPPLIERS&m=insertSupplier`

Description:

Cria um fornecedor(com NIF).

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "insertSupplier"
VATIN*: NIF do fornecedor
Name*: nome do fornecedor
Address: morada do fornecedor
PostalCode: código postal do fornecedor
Locality: localidade do fornecedor
IdCountry: id do país ou CountryCode: código/sigla do país (ISO-3166 1-alpha-2)
Phone: contacto telefónico do fornecedor
Fax: fax do fornecedor
Email: endereço de email do fornecedor
Comments: observações úteis relativas a este fornecedor
IdSupplier: id do fornecedor
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertSupplier","VATIN":"987654321","Name":"Fornecedor B"}'
```

#### listSuppliers

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=SUPPLIERS&m=listSuppliers`

Description:

Lista de fornecedores.
(100 registos começando na posição indicada em «offset»)

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "listSuppliers"
Name: nome do fornecedor
VATIN: NIF do fornecedor
Contact: telefone ou telemóvel do fornecedor
Offset: nº do registo/linha a partir do qual deve construir a resposta
```

Responses:

```text
{Status:1,Data:{Suppliers:[{IdSupplier,VATIN,Name,Address,Locality,PostalCode,Phone,Fax,Email,Comments}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"listSuppliers"}'
```

#### supplierExists

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=SUPPLIERS&m=supplierExists`

Description:

Verifica se um fornecedor existe.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "supplierExists"
IdSupplier*: id do fornecedor ou VATIN*: NIF do fornecedor
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"supplierExists","VATIN":"987654321"}'
```

#### updateSupplier

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=SUPPLIERS&m=updateSupplier`

Description:

Atualiza os dados de um fornecedor.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "updateSupplier"
IdSupplier*: id do fornecedor ou VATIN*: NIF do fornecedor
Name: nome do fornecedor
Address: morada do fornecedor
PostalCode: código postal do fornecedor
Locality: localidade do fornecedor
Phone: contacto telefónico do fornecedor
Fax: fax do fornecedor
Email: endereço de email do fornecedor
Comments: observações úteis relativas a este fornecedor
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"updateSupplier","IdSupplier":"100","Email":"email@dominio.com"}'
```

### PRODUCTS

- `countProducts`
- `deleteProduct`
- `getProduct`
- `insertProduct`
- `listProducts`
- `productExists`
- `setProductColorSize`
- `updateProduct`

#### countProducts

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=PRODUCTS&m=countProducts`

Description:

Indica o número total de artigos (visíveis para a API).

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "countProducts"
```

Responses:

```text
{Status:1,Data:{Count}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"countProducts"}'
```

#### deleteProduct

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=PRODUCTS&m=deleteProduct`

Description:

Apaga um artigo.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "deleteProduct"
IdProduct*: id do artigo
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"deleteProduct","IdProduct":"P00002"}'
```

#### getProduct

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=PRODUCTS&m=getProduct`

Description:

Devolve os dados de um artigo.

Image em formato Base64.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getProduct"
IdProduct*: id do artigo
```

Responses:

```text
{Status:1,Data:{IdProduct,Name,ShortName,IdTax,TaxValue,TaxExemptionReasonCode,Comment,IsService,HasStock,HandlingType,Price,TaxIncluded,Active,
ShortDescription,LongDescription,Image,IdFamily,Family,FamilyTree:[{IdFamily,FamilyName,FamilyCategoryId,Ref}],SupplierRef,EAN,Stock,
IdBrand,BrandName,BrandModels:[{IdModel,ModelName}],DirectDiscount,Type,Warranty,Hidden,Weight,CostPrice,
Colors:[{IdColor,ColorName,Image}],Sizes:[{IdSize,SizeName}],StockColorsSizes:[{IdColor,IdSize,Stock}]}}

{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getProduct","IdProduct":"A001"}'
```

#### insertProduct

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=PRODUCTS&m=insertProduct`

Description:

Cria um artigo.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "insertProduct"
IdProduct*: id do artigo
Name*: nome do artigo
ShortName: abreviatura
IdTax*: id da taxa de IVA ou TaxValue*: taxa de IVA
TaxExemptionReasonCode: código do motivo de isenção (M??) (* se TaxValue=0)
IsService*: reconhecido como serviço? (0 ou 1)
HasStocks*: artigo movimenta stock? (0 ou 1)
Active: ativo na API? (0 ou 1)
Comment: observações
ShortDesc: descrição curta
LongDesc: descrição longa
Price*: preço de venda (consoante o tipo de escalão de preço da chave API)
SupplierRef: refª de fornecedor
EAN: código de barras
IdFamily: id da família
CostPrice: preço de custo(s/IVA)
Weight: peso
ColorSizeProduct: modo de tratamento cores e tamanhos? (=1)
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertProduct","IdProduct":"P000123","Name":"Produto A","TaxValue":"23","IsService":"0","HasStocks":"1","Price":"99.99"}'
```

#### listProducts

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=PRODUCTS&m=listProducts`

Description:

Lista de artigos (visíveis para a API).
(100 registos começando na posição indicada em «offset»)

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "listProducts"
IdProduct: id do artigo
Name: nome do artigo
SupplierRef: referência do fornecedor
ColorsSizes: modo de tratamento cores/tamanhos (0 ou 1) 
Offset: nº do registo/linha a partir do qual deve construir a resposta
```

Responses:

```text
{Status:1,Data:{Products:[{IdProduct,Name,ShortName,TaxValue,Comment,IsService,HasStocks,HandlingType,Price,TaxIncluded,
ShortDescription,LongDescription,IdFamily,Family,FamilyTree:[{IdFamily,FamilyName,FamilyCategoryId,Ref}],
SupplierRef,EAN,Stock,IdBrand,BrandName,BrandModels:[{IdModel,ModelName}],DirectDiscount,Weight}]}}

{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"listProducts"}'
```

#### productExists

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=PRODUCTS&m=productExists`

Description:

Verifica se um artigo existe.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "productExists"
IdProduct*: id do artigo
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"productExists","IdProduct":"A001"}'
```

#### setProductColorSize

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=PRODUCTS&m=setProductColorSize`

Description:

Associa uma cor ou tamanho a um artigo.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "setProductColorSize"
IdProduct*: id do artigo
Type*: tipo cor/tamanho (color ou size)
Id*: id da cor ou do tamanho
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"setProductColorSize","IdProduct":"P00501","Type":"color","Id":"10"}'
```

#### updateProduct

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=PRODUCTS&m=updateProduct`

Description:

Atualiza os dados de um artigo.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "updateProduct"
IdProduct*: id do artigo
Name: nome do artigo
ShortName: abreviatura
IdTax: id da taxa de IVA ou TaxValue: taxa de IVA
TaxExemptionReasonCode: código do motivo de isenção (M??) (* se TaxValue=0)
Active: ativo na API? (0 ou 1)
Comment: observações
ShortDesc: descrição curta
LongDesc: descrição longa
Price: preço de venda (consoante o tipo de escalão de preço da chave API)
SupplierRef: refª de fornecedor
EAN: código de barras
IdFamily: id da família
CostPrice: preço de custo(s/IVA)
Weight: peso
```

Responses:

```text
{Status:1,Data:{Id}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"updateProduct","IdProduct":"P00002","IdFamily":"10","Price":"10.00"}'
```

### DOCUMENTS

- `checkIfSettle`
- `checkInvoiceComAT`
- `countDocuments`
- `creditRegularization`
- `documentsList`
- `generateMBRef`
- `getDocument`
- `getDocumentPDF`
- `insertBudget`
- `insertDocument`
- `insertReceipt`
- `insertStockDocument`
- `registerInvoiceAT`
- `sendDocumentPDF2Email`
- `setDocumentVoid`
- `setReceiptVoid`
- `settleInvoice`
- `transportDocumentCommunication`

#### checkIfSettle

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=checkIfSettle`

Description:

Verifica se o documento tem valor pendente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "checkIfSettle"
DocType*: tipo de documento
DocNum*: nº do documento
DocSeries: id da série de documentos (se não for indicado será usada a série definida na chave API)
```

Responses:

```text
{Status:1,Data:{Value}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"checkIfSettle","DocType":"4","DocNum":"561"}'
```

#### checkInvoiceComAT

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=checkInvoiceComAT`

Description:

Verifica o estado da comunicação do documento à AT - Autoridade Tributária.
Para que funcione, é necessário garantir que a configuração desta API específica é feita corretamente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "checkInvoiceComAT"
DocType*: tipo de documento
DocNum*: nº do documento
DocSeries: id da série de documentos (se não for indicado será usada a série definida na chave API)
```

Responses:

```text
{Status:1,Data:{Message}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"checkInvoiceComAT","DocType":"34","DocNum":"101"}'
```

#### countDocuments

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=countDocuments`

Description:

Indica o número total de documentos do tipo indicado. (Ver tipos de documentos em anexos)

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "countDocuments"
DocType*: tipo de documento
```

Responses:

```text
{Status:1,Data:{Count}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"countDocuments","DocType":"4"}'
```

#### creditRegularization

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=creditRegularization`

Description:

Regulariza uma nota de crédito.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "creditRegularization"
DocNum*: nº da nota de crédito
DocSeries: id da série de nota de crédito(se não for indicado será usada a série definida na chave API)
RegulaSeries: id da série de regularização(se não for indicado será usada a série definida na chave API)
DocReference: refª documento
```

Responses:

```text
{Status:1,Data:{DocSeries,DocNum}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"creditRegularization","DocNum":"10"}'
```

#### documentsList

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=documentsList`

Description:

Lista de documentos do tipo indicado. (Ver tipos de documentos em anexos)
(100 registos começando na posição indicada em «offset»)

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "documentsList"
DocType*: tipo de documento
IdClient: id do cliente
DocSeries: id da série de documentos
DocNum: nº do documento
Offset: nº do registo/linha a partir do qual deve construir a resposta
```

Responses:

```text
{Status:1,Data:{Documents:[{DocType,DocSeries,DocNum,Date,IdClient,VATIN,ClientName,GrossTotal}]}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"documentsList","DocType":"4","Offset":"100"}'
```

#### generateMBRef

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=generateMBRef`

Description:

Gera uma referência multibanco e associa-a ao documento(Fatura).

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "generateMBRef"
DocType*: tipo de documento
DocNum*: nº do documento
DocSeries: id da série de documentos (se não for indicado será usada a série definida na chave API)
```

Responses:

```text
{Status:1,Data:{Entity,Reference,Value}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"generateMBRef","DocType":"4","DocNum":"10106"}'
```

#### getDocument

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=getDocument`

Description:

Obtém os dados de um documento.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getDocument"
DocType*: tipo de documento
DocNum*: nº do documento
DocSeries: id da série de documentos (se não for indicado será usada a série definida na chave API)
```

Responses:

```text
{Status:1,Data:{DocType,DocSeries,DocNum,Date,IdClient,VATIN,ClientName,Discounts,FinancialDiscount,NetTotal,TaxTotal,GrossTotal,Comments,ATDocCodeID,Reference,PaymentType,Voided,
Lines:[{DocLin,IdProduct,ProductName,UnitPrice,Qty,Discount,TaxValue,NetValue,ColorsSizes:[{IdColor,ColorName,IdSize,SizeName,Qty}]}]}}

{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getDocument","DocType":"4","DocNum":"1001"}'
```

#### getDocumentPDF

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=getDocumentPDF`

Description:

Devolve o conteúdo do ficheiro de um documento.

DocumentBinary em formato Base64.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "getDocumentPDF"
DocType*: tipo de documento
DocNum*: nº do documento
DocSeries: id da série de documentos (se não for indicado será usada a série definida na chave API)
Format: formato "A4"(default) ou "ticket"
Signed: assinatura digital? (=1 só disponível em formato A4)
```

Responses:

```text
{Status:1,Data:{DocumentBinary}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"getDocumentPDF","DocType":"4","DocNum":"1001"}'
```

#### insertBudget

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=insertBudget`

Description:

Cria um orçamento. (só permite artigos com modo de tratamento simples)

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "insertBudget"
DocSeries: id da série de orçamento(se não for indicado será usada a série definida na chave API)
Designation: designação do orçamento
IdClient*: id do cliente

DocLines*: lista de linhas do documento, contendo os seguintes parâmetros 
 IdProduct*: id do artigo
 ProductName: nome do artigo
 Qty*: quantidade do artigo
 Price: preço do artigo
 IdTax: id da taxa de IVA
 Discount: desconto(%)
```

Responses:

```text
{Status:1,Data:{DocType,DocSeries,DocNum,FullDocNumber}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertBudget","IdClient":"1005","DocLines":[{"IdProduct":"A001","Qty":"200","Price":"49.99","Discount":"40"}]}'
```

#### insertDocument

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=insertDocument`

Description:

Cria um documento. (Ver tipos de documentos em anexos)

Para emitir a consumidor final(sem NIF) deve preencher os dados de identificação do cliente sem preencher o IdClient.
O IVA incluído nos preços(Price) depende da configuração do utilizador da chave API.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "insertDocument"
DocType*: tipo de documento
DocSeries: id da série de documentos (se não for indicado será usada a série definida na chave API)

IdClient: id do cliente
Name: nome do consumidor final
Address: morada do consumidor final
PostalCode: código postal do consumidor final
Locality: localidade do consumidor final
IdCountry: id do país do consumidor final ou CountryCode: código/sigla do país do consumidor final(ISO-3166 1-alpha-2)

DocDate: data de emissão (formato: AAAA-MM-DD)
DueDate: data de vencimento (formato: AAAA-MM-DD)
DocReference: refª documento de origem
Comments: observações
PrintComment: comentário p/impressão
TaxRetention: taxa de retenção
Discount: desconto financeiro(%) ou DiscountValue: desconto financeiro em valor
IdSalesman: id do vendedor
IdPaymentMethod: id do modo de pagamento ou PaymentMethods: lista de modos de pagamento [{IdPaymentMethod: id do modo de pagamento,Value: valor}]
IdAlternativeCurrency: id da 2ª moeda do documento
AlternativeCurrencyConversionValue: valor do câmbio em relação à moeda base

MovementStartTime: data e hora do início de transporte (formato: AAAA-MM-DD hh:mm)
ShipFromAddress: morada do início de transporte
ShipFromLocality: localidade do início de transporte
ShipFromPostalCode: código postal do início de transporte
ShipFromIdCountry: id do país do início de transporte ou ShipFromCountryCode: código/sigla do país do início de transporte(ISO-3166 1-alpha-2)
MovementEndTime: data e hora do fim de transporte (formato: AAAA-MM-DD hh:mm)
ShipToAddress: morada do fim de transporte
ShipToLocality: localidade do fim de transporte
ShipToPostalCode: código postal do fim de transporte
ShipToIdCountry: id do país do fim de transporte ou ShipToCountryCode: código/sigla do país do fim de transporte(ISO-3166 1-alpha-2)
LicencePlate: matrícula da viatura

DocLines*: lista de linhas do documento, contendo os seguintes parâmetros 
 IdProduct*: id do artigo
 ProductName: nome do artigo
 Qty*: quantidade do artigo(para artigos com modo de tratamento simples)
 ColorsSizes*: lista de quantidades por cor/tamanho [{IdColor: id da cor,IdSize: id do tamanho,Qty: quantidade}]
 Price: preço do artigo
 IdTax: id da taxa de IVA
 Discount: desconto(%)
```

Responses:

```text
{Status:1,Data:{DocType,DocSeries,DocNum,FullDocNumber}}
{Status:0,ErrorMessage}
```

Example curl:

```text
1.
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertDocument","DocType":"4","IdClient":"100","Discount":"10","IdPaymentMethod":"2",
"DocLines":[{"IdProduct":"A001","Qty":"2","Price":"9.99","IdTax":"1"},{"IdProduct":"P0012","Qty":"1","Price":"49.99","IdTax":"2","Discount":"20"}]}'

2.
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertDocument","DocType":"34","Name":"Nome ...","Address":"Morada ...","PostalCode":"1234-123",
"DocLines":[{"IdProduct":"C001","ColorsSizes":[{"IdColor":"25","IdSize":"1","Qty":"1"},{"IdColor":"14","IdSize":"6","Qty":"2"}]}]}'
```

#### insertReceipt

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=insertReceipt`

Description:

Cria um recibo.

Para emitir a consumidor final(sem NIF) deve preencher os dados de identificação do cliente sem preencher o IdClient.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "insertReceipt"
ReceiptSeries: id da série de recibos(se não for indicado será usada a série definida na chave API)
Discount: desconto(%)

IdClient: id do cliente
Name: nome do consumidor final
Address: morada do consumidor final
PostalCode: código postal do consumidor final
Locality: localidade do consumidor final
IdCountry: id do país do consumidor final ou CountryCode: código/sigla do país do consumidor final(ISO-3166 1-alpha-2)

DocLines*: lista de linhas do recibo, contendo os seguintes parâmetros 
 DocType*: tipo de documento
 DocSeries*: id da série de documento
 DocNum*: nº do documento
 SettleValue*: valor a liquidar
```

Responses:

```text
{Status:1,Data:{DocType,DocSeries,DocNum,FullDocNumber}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertReceipt","IdClient":"1005",
"DocLines":[{"DocType":"4","DocSeries":"20","DocNum":"10","SettleValue":"61.99"},{"DocType":"7","DocSeries":"23","DocNum":"3","SettleValue":"29.99"}]}'
```

#### insertStockDocument

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=insertStockDocument`

Description:

Cria um documento de acerto de stock.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "insertStockDocument"
DocSeries*: id da série de documento de acerto de stock(da mesma delegação da chave API)
DocDate: data de emissão (formato: AAAA-MM-DD)
DocReference*: refª documento
Comments: observações
IdWarehouse: id do armazém(da mesma delegação da chave API)

DocLines*: lista de linhas do documento, contendo os seguintes parâmetros 
 IdProduct*: id do artigo
 Qty*: quantidade do artigo(para artigos com modo de tratamento simples)
 ColorsSizes*: lista de quantidades por cor/tamanho [{IdColor: id da cor,IdSize: id do tamanho,Qty: quantidade}]
```

Responses:

```text
{Status:1,Data:{DocNum}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"insertStockDocument","DocSeries":"100","DocReference":"REF 0001","DocLines":[{"IdProduct":"A001","Qty":"10"}]}'
```

#### registerInvoiceAT

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=registerInvoiceAT`

Description:

Comunica um documento à AT - Autoridade Tributária.
Para que funcione, é necessário garantir que a configuração desta API específica é feita corretamente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "registerInvoiceAT"
DocType*: tipo de documento
DocNum*: nº do documento
DocSeries: id da série de documentos (se não for indicado será usada a série definida na chave API)
```

Responses:

```text
{Status:1,Data:{Message}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"registerInvoiceAT","DocType":"34","DocNum":"101"}'
```

#### sendDocumentPDF2Email

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=sendDocumentPDF2Email`

Description:

Envia o pdf de um documento para um endereço ou um conjunto de endereços de email.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "sendDocumentPDF2Email"
DocType*: tipo de documento
DocNum*: nº do documento
EmailDestinations*: endereços de email dos destinatários (separados por ;)
EmailSubject*: assunto
EmailBody*: mensagem
DocSeries: id da série de documentos (se não for indicado será usada a série definida na chave API)
Signed: assinatura digital? (=1)
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"sendDocumentPDF2Email","DocType":"4","DocNum":"1001","EmailDestinations":"email1@dominio.com;email2@dominio.com","EmailSubject":"Assunto ...","EmailBody":"Mensagem ..."}'
```

#### setDocumentVoid

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=setDocumentVoid`

Description:

Anula/Estorna um documento emitido anteriormente. (4 - Fatura, 32 - Fatura Simplificada, 34 - Fatura-Recibo)
Existe um limite de 5 dias para anular o documento, após esse prazo será emitida nota de crédito(estorno).

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "setDocumentVoid"
DocType*: tipo de documento a anular/estornar
DocNum*: nº do documento a anular/estornar
DocSeries: id da série do documento a anular/estornar(se não for indicado será usada a série definida na chave API)
CreditSeries: id da série de nota de crédito(se não for indicado será usada a série definida na chave API)
CreditDate: data de emissão da nota de crédito(formato: AAAA-MM-DD)
CreditReason: motivo de estorno
```

Responses:

```text
{Status:1,Data:{Voided,Message}}
{Status:1,Data:{DocType,DocSeries,DocNum,FullDocNumber}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"setDocumentVoid","DocType":"4","DocNum":"30","CreditReason":"Motivo ..."}'
```

#### setReceiptVoid

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=setReceiptVoid`

Description:

Anula um recibo.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "setReceiptVoid"
DocNum*: nº do recibo a anular
DocSeries: id da série de recibo(se não for indicado será usada a série definida na chave API)
```

Responses:

```text
{Status:1}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"setReceiptVoid","DocNum":"230"}'
```

#### settleInvoice

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=settleInvoice`

Description:

Gera um recibo para o documento indicado com o valor pendente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "settleInvoice"
DocType*: tipo de documento
DocNum*: nº do documento
DocSeries: id da série de documentos (se não for indicado será usada a série definida na chave API)
Discount: desconto(%)
```

Responses:

```text
{Status:1,Data:{DocType,DocSeries,DocNum,FullDocNumber}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"settleInvoice","DocType":"4","DocNum":"561"}'
```

#### transportDocumentCommunication

Source: `https://login.keyinvoice.com/DocumentacaoAPI5.php?s=DOCUMENTS&m=transportDocumentCommunication`

Description:

Permite fazer a comunicação do documento (Guia de Transporte ou Guia de Remessa) à AT - Autoridade Tributária, retornando o Código de identificação(AT) gerado por aquele sistema. Para que funcione, é necessário garantir que a configuração desta API específica é feita corretamente.

Headers:

```text
Sid: IDENTIFICADOR_SESSÃO 
Content-Type: application/json
```

Parameters:

```text
method*: "transportDocumentCommunication"
DocType*: tipo de documento
DocNum*: nº do documento
DocSeries: id da série de documentos (se não for indicado será usada a série definida na chave API)
```

Responses:

```text
{Status:1,Data:{ATDocCodeId}}
{Status:0,ErrorMessage}
```

Example curl:

```text
curl --request POST ENDEREÇO_API \ 
--header 'Sid: IDENTIFICADOR_SESSÃO' --header 'Content-Type: application/json' \ 
--data '{"method":"transportDocumentCommunication","DocType":"16","DocNum":"35"}'
```
