#include <iostream>
#include <vector>
#include <set>
#include <map>
#include <queue>
#include <stack>
#include <algorithm>
#include <iomanip>
using namespace std;

enum Type { SYMBOL, OR, CAT, STAR };

struct Node {
    Type type;
    char val;
    int pos;
    Node *left,*right;

    bool nullable;
    set<int> firstpos,lastpos;

    Node(Type t,char v='\0',int p=-1){
        type=t; val=v; pos=p;
        left=right=NULL;
        nullable=false;
    }
};

bool isSymbol(char c){
    return isalnum(c) || c=='#';
}

string addConcat(string s){
    string r="";
    for(int i=0;i<s.size();i++){
        r+=s[i];
        if(i+1<s.size()){
            char a=s[i], b=s[i+1];
            if((isSymbol(a)||a=='*'||a==')') &&
               (isSymbol(b)||b=='('))
                r+='.';
        }
    }
    return r;
}

int prec(char c){
    if(c=='*') return 3;
    if(c=='.') return 2;
    if(c=='|') return 1;
    return 0;
}

Node* Tree(string regex,int &pos){
    stack<Node*> nodes;
    stack<char> ops;

    auto apply=[&](char op){

        if(op=='*'){
            Node* a=nodes.top(); nodes.pop();
            Node* n=new Node(STAR);
            n->left=a;
            nodes.push(n);
        }

        else{
            Node* b=nodes.top(); nodes.pop();
            Node* a=nodes.top(); nodes.pop();

            Node* n=new Node(op=='.'?CAT:OR);
            n->left=a;
            n->right=b;
            nodes.push(n);
        }
    };

    for(char c:regex){

        if(isSymbol(c))
            nodes.push(new Node(SYMBOL,c,pos++));

        else if(c=='(')
            ops.push(c);

        else if(c==')'){
            while(ops.top()!='('){
                apply(ops.top()); ops.pop();
            }
            ops.pop();
        }

        else{
            while(!ops.empty() && prec(ops.top())>=prec(c)){
                apply(ops.top()); ops.pop();
            }
            ops.push(c);
        }
    }

    while(!ops.empty()){
        apply(ops.top()); ops.pop();
    }

    return nodes.top();
}


void FirstLastPos(Node* n){

    if(!n) return;

    FirstLastPos(n->left);
    FirstLastPos(n->right);

    if(n->type==SYMBOL){
        n->firstpos.insert(n->pos);
        n->lastpos.insert(n->pos);
        n->nullable=false;
    }

    else if(n->type==OR){
        n->nullable=n->left->nullable || n->right->nullable;

        n->firstpos=n->left->firstpos;
        n->firstpos.insert(n->right->firstpos.begin(),
                           n->right->firstpos.end());

        n->lastpos=n->left->lastpos;
        n->lastpos.insert(n->right->lastpos.begin(),
                          n->right->lastpos.end());
    }

    else if(n->type==CAT){

        n->nullable=n->left->nullable && n->right->nullable;

        n->firstpos=n->left->firstpos;
        if(n->left->nullable)
            n->firstpos.insert(n->right->firstpos.begin(),
                               n->right->firstpos.end());

        n->lastpos=n->right->lastpos;
        if(n->right->nullable)
            n->lastpos.insert(n->left->lastpos.begin(),
                              n->left->lastpos.end());
    }

    else if(n->type==STAR){
        n->nullable=true;
        n->firstpos=n->left->firstpos;
        n->lastpos=n->left->lastpos;
    }
}


void followpos(Node* n,map<int,set<int>>& follow){

    if(!n) return;

    followpos(n->left,follow);
    followpos(n->right,follow);

    if(n->type==CAT){
        for(int i:n->left->lastpos)
            follow[i].insert(n->right->firstpos.begin(),
                             n->right->firstpos.end());
    }

    if(n->type==STAR){
        for(int i:n->lastpos)
            follow[i].insert(n->firstpos.begin(),
                             n->firstpos.end());
    }
}


void Map(Node* n,map<int,char>& mp){
    if(!n) return;
    if(n->type==SYMBOL) mp[n->pos]=n->val;
    Map(n->left,mp);
    Map(n->right,mp);
}


void printTable(Node* n, map<int,set<int>>& follow){

    if(!n) return;

    printTable(n->left,follow);
    printTable(n->right,follow);

    if(n->type==SYMBOL){

        cout<<setw(6)<<n->pos
            <<setw(8)<<n->val
            <<setw(10)<<(n->nullable ? "T" : "F")<<"   {";

        for(int x:n->firstpos) cout<<x<<" ";
        cout<<"}   {";

        for(int x:n->lastpos) cout<<x<<" ";
        cout<<"}   {";

        for(int x:follow[n->pos]) cout<<x<<" ";
        cout<<"}\n";
    }
}



void DFA(set<int> start,
              set<char> alpha,
              map<int,set<int>>& follow,
              map<int,char>& mp){

    vector<set<int>> states;
    map<pair<int,char>,int> trans;
    queue<int> q;

    states.push_back(start);
    q.push(0);

    int emptyIndex=-1;

    while(!q.empty()){

        int s=q.front(); q.pop();

        for(char a:alpha){

            set<int> U;

            for(int p:states[s])
                if(mp[p]==a)
                    U.insert(follow[p].begin(),follow[p].end());

            if(U.empty()){
                if(emptyIndex==-1){
                    states.push_back({});
                    emptyIndex=states.size()-1;
                }
                trans[{s,a}]=emptyIndex;
            }

            else{
                auto it=std::find(states.begin(),states.end(),U);
                int id;

                if(it==states.end()){
                    states.push_back(U);
                    id=states.size()-1;
                    q.push(id);
                }
                else id=it-states.begin();

                trans[{s,a}]=id;
            }
        }
    }

    if(emptyIndex!=-1)
        for(char a:alpha)
            trans[{emptyIndex,a}]=emptyIndex;


    cout<<"\nDFA Table\nState\t";
    for(char a:alpha) cout<<a<<"\t";
    cout<<"\n";

    for(int i=0;i<states.size();i++){
        cout<<"S"<<i<<"\t";
        for(char a:alpha)
            cout<<"S"<<trans[{i,a}]<<"\t";
        cout<<"\n";
    }

    cout<<"\nStates\n";
    for(int i=0;i<states.size();i++){
        cout<<"S"<<i<<" = { ";
        for(int x:states[i]) cout<<x<<" ";
        cout<<"}\n";
    }
}


int main(){

    string regex;
    cout<<"Enter Regex : ";
    cin>>regex;

    regex="("+regex+")#";
    regex=addConcat(regex);

    int pos=1;

    Node* root=Tree(regex,pos);

    FirstLastPos(root);

    map<int,set<int>> follow;
    followpos(root,follow);

    map<int,char> mp;
    Map(root,mp);

    set<char> alpha;
    for(auto x:mp)
        if(x.second!='#')
            alpha.insert(x.second);

    cout<<"\nNode Symbol First Last Follow\n";
    printTable(root,follow);

    DFA(root->firstpos,alpha,follow,mp);
}
